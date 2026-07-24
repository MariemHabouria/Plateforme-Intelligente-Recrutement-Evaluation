# ia_service/ats/ats_engine.py
# Couche 3 — Moteur ATS : matching inverse + ranking + shortlist
#
# CHANGELOG v1.2 :
# Fix 5 : rank_candidates() branche seuilMatching de ScoringConfig sur ATSEngine.
#          L'admin peut maintenant changer le seuil depuis l'interface sans
#          redémarrer le service Python.
#          seuil_ats       = max(30, config.seuil_matching - 20)
#          seuil_shortlist = config.seuil_matching

import re
import math
import time
import logging
import unicodedata
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional

import numpy as np

from ..schemas import CVExtrait, OffreInput, ResultatScoring
from ..scoring.scorer import cv_scorer, NIVEAUX_DIPLOME, FORMATION_MIN, _norm, _niveau_diplome
from ..config.scoring_config import ScoringConfig
from ..cv_extractor.parser import extract_experience_years

log = logging.getLogger("ia_service.ats")


# =============================================================================
# 1. DATACLASSES RESULTAT ATS
# =============================================================================

@dataclass
class ATSKeywordAnalysis:
    keywords_required_present:  List[str] = field(default_factory=list)
    keywords_required_missing:  List[str] = field(default_factory=list)
    keywords_bonus_present:     List[str] = field(default_factory=list)
    keywords_synonyms_matched:  List[Tuple[str, str]] = field(default_factory=list)
    keyword_coverage_pct:       float = 0.0
    keyword_density_cv:         float = 0.0
    ats_passthrough:            bool  = False


@dataclass
class ATSGapAnalysis:
    gap_competences:    List[str] = field(default_factory=list)
    gap_experience:     float = 0.0
    gap_formation:      int   = 0
    actions_requises:   List[str] = field(default_factory=list)
    actions_souhaitees: List[str] = field(default_factory=list)
    profil_partiel:     bool  = False
    profil_eligible:    bool  = False
    motif_rejet:        Optional[str] = None


@dataclass
class ATSRankEntry:
    rang:                   int
    candidature_id:         str
    candidat_nom:           str
    candidat_email:         str
    score_global:           int
    score_competences:      float
    score_experience:       float
    score_formation:        float
    score_semantique:       float
    recommandation:         str
    keyword_coverage:       float
    ats_passthrough:        bool
    competences_detectees:  List[str]
    competences_manquantes: List[str]
    gap:                    ATSGapAnalysis
    keywords:               ATSKeywordAnalysis
    temps_scoring_ms:       float
    details:                Optional[ResultatScoring] = None


@dataclass
class ATSShortlist:
    offre_id:               str
    offre_intitule:         str
    n_candidats_evalues:    int
    n_ats_pass:             int
    n_shortlist:            int
    seuil_utilise:          int
    shortlist:              List[ATSRankEntry] = field(default_factory=list)
    pool_complet:           List[ATSRankEntry] = field(default_factory=list)
    stats:                  dict = field(default_factory=dict)


# Compatibilite router existant
@dataclass
class ATSMatchResult:
    candidature_id: str
    candidat_nom: str
    candidat_email: str
    score_global: int
    score_experience: int
    competences_detectees: List[str]
    competences_manquantes: List[str]
    recommandation: str
    eligible: bool
    rang: int = 0
    details: Optional[ResultatScoring] = None


# =============================================================================
# 2. SYNONYMES & ONTOLOGIE METIER
# =============================================================================

SKILL_SYNONYMS: Dict[str, List[str]] = {
    "python":           ["python3", "py", "django", "flask", "fastapi"],
    "javascript":       ["js", "es6", "node.js", "nodejs", "typescript", "ts"],
    "react":            ["react.js", "reactjs", "react native", "next.js"],
    "sql":              ["mysql", "postgresql", "postgres", "sqlite", "pl/sql", "t-sql"],
    "machine learning": ["ml", "deep learning", "ai", "scikit-learn", "sklearn",
                         "tensorflow", "pytorch", "keras", "nlp"],
    "docker":           ["containerization", "containers", "podman"],
    "aws":              ["amazon web services", "ec2", "s3", "lambda", "cloud"],
    "git":              ["github", "gitlab", "bitbucket", "version control"],
    "excel":            ["spreadsheet", "vba", "google sheets", "libreoffice calc"],
    "agile":            ["scrum", "kanban", "sprint", "jira", "confluence"],
    "linux":            ["unix", "bash", "shell", "ubuntu", "centos", "debian"],
    "java":             ["spring", "spring boot", "maven", "gradle", "jvm"],
    "data":             ["data science", "data analysis", "analytics", "bi",
                         "business intelligence", "power bi", "tableau"],
    "kubernetes":       ["k8s", "helm", "orchestration", "container orchestration"],
    "sap":              ["sap hana", "sap erp", "sap fi", "sap mm", "sap sd"],
    "marketing digital": ["seo", "sem", "google ads", "social media", "inbound"],
    # ── IA / NLP (Fix 5 : ajout pour matcher les offres IA) ──────────────────
    "nlp":              ["natural language processing", "text mining", "ner",
                         "sentiment analysis", "transformers", "bert", "llm"],
    "tensorflow":       ["tf", "keras", "deep learning"],
    "scikit-learn":     ["sklearn", "scikit learn", "machine learning"],
    "spacy":            ["spaCy", "nlp python", "ner python"],
    "shap":             ["explainability", "xai", "lime", "model explanation"],
    "fastapi":          ["fast api", "python api", "rest api python"],
}

_SYNONYM_REVERSE: Dict[str, str] = {}
for _canonical, _syns in SKILL_SYNONYMS.items():
    for _s in _syns:
        _SYNONYM_REVERSE[_s.lower()] = _canonical

# Seuils ATS par defaut (utilises uniquement si config.seuil_matching non disponible)
ATS_SEUIL_PASSTHROUGH = 45
ATS_SEUIL_SHORTLIST   = 65
ATS_SEUIL_FORT        = 80
ATS_SHORTLIST_MAX     = 10


# =============================================================================
# 3. HELPERS
# =============================================================================

def _niveau_requis(offre: OffreInput) -> int:
    if offre.formation_requise:
        niv = _niveau_diplome(offre.formation_requise)
        if niv > 0:
            return niv
    default = FORMATION_MIN.get(offre.niveau_poste.upper(), "bac+3")
    return NIVEAUX_DIPLOME.get(default, 4)


def _extract_exp_from_texte(cv_texte: str, score_exp_fallback: float) -> float:
    if cv_texte and len(cv_texte.strip()) > 50:
        try:
            annees = extract_experience_years(cv_texte)
            if annees > 0:
                return annees
        except Exception as e:
            log.debug(f"extract_experience_years echoue : {e}")

    fallback = round(min(score_exp_fallback / 10, 15.0), 1)
    log.debug(f"Fallback scoreExp->annees : {score_exp_fallback} -> {fallback}ans")
    return fallback


# =============================================================================
# 4. MOTEUR ATS
# =============================================================================

class ATSEngine:

    def __init__(
        self,
        config: Optional[ScoringConfig] = None,
        seuil_ats: int = ATS_SEUIL_PASSTHROUGH,
        seuil_shortlist: int = ATS_SEUIL_SHORTLIST,
    ):
        self.config          = config
        self.seuil_ats       = seuil_ats
        self.seuil_shortlist = seuil_shortlist

    def _analyze_keywords(self, cv: CVExtrait, offre: OffreInput) -> ATSKeywordAnalysis:
        cv_text_lower  = _norm(cv.texte_brut or " ".join(cv.competences))
        cv_skills_norm = {_norm(s) for s in cv.competences}

        required_present, required_missing = [], []
        synonyms_matched = []

        for req_skill in offre.competences:
            req_norm = _norm(req_skill)

            if req_norm in cv_skills_norm or req_norm in cv_text_lower:
                required_present.append(req_skill)
                continue

            canonical  = _SYNONYM_REVERSE.get(req_norm, req_norm)
            syns       = SKILL_SYNONYMS.get(canonical, []) + SKILL_SYNONYMS.get(req_norm, [])
            matched_syn = None
            for syn in syns:
                if _norm(syn) in cv_skills_norm or _norm(syn) in cv_text_lower:
                    matched_syn = syn
                    break

            if matched_syn:
                required_present.append(req_skill)
                synonyms_matched.append((req_skill, matched_syn))
            else:
                if len(req_norm) > 4 and req_norm in cv_text_lower:
                    required_present.append(req_skill)
                else:
                    required_missing.append(req_skill)

        bonus_present = []
        for bon_skill in offre.competences_souhaitees:
            bon_norm = _norm(bon_skill)
            if bon_norm in cv_skills_norm or bon_norm in cv_text_lower:
                bonus_present.append(bon_skill)
            else:
                syns = SKILL_SYNONYMS.get(bon_norm, [])
                if any(_norm(s) in cv_skills_norm for s in syns):
                    bonus_present.append(bon_skill)

        n_req    = max(len(offre.competences), 1)
        coverage = len(required_present) / n_req

        cv_words = re.findall(r'\b\w{3,}\b', cv_text_lower)
        kw_hits  = sum(1 for w in cv_words if w in {_norm(s) for s in offre.competences})
        density  = kw_hits / max(len(cv_words), 1)

        return ATSKeywordAnalysis(
            keywords_required_present = required_present,
            keywords_required_missing = required_missing,
            keywords_bonus_present    = bonus_present,
            keywords_synonyms_matched = synonyms_matched,
            keyword_coverage_pct      = round(coverage * 100, 1),
            keyword_density_cv        = round(density * 100, 2),
            ats_passthrough           = coverage >= 0.40,
        )

    def _analyze_gaps(
        self,
        cv: CVExtrait,
        offre: OffreInput,
        scoring: ResultatScoring,
        kw: ATSKeywordAnalysis,
    ) -> ATSGapAnalysis:
        gap = ATSGapAnalysis()

        gap.gap_competences = kw.keywords_required_missing

        exp_manquante   = max(0.0, offre.experience_min_annees - cv.experience_annees)
        gap.gap_experience = round(exp_manquante, 1)

        niv_req    = _niveau_requis(offre)
        niveaux_cv = []
        for d in cv.diplomes:
            if isinstance(d, dict):
                libelle = f"{d.get('diplome', '') or ''} {d.get('niveau', '') or ''}".strip()
            elif isinstance(d, str):
                libelle = d
            else:
                libelle = ''
            if libelle:
                niveaux_cv.append(_niveau_diplome(libelle))
        niv_cv          = max(niveaux_cv) if niveaux_cv else 0
        gap.gap_formation = max(0, niv_req - niv_cv)

        gap.profil_eligible = scoring.score_global >= self.seuil_shortlist
        gap.profil_partiel  = (self.seuil_ats <= scoring.score_global < self.seuil_shortlist)

        if gap.gap_competences:
            gap.actions_requises.append(
                "Competences manquantes : {}".format(", ".join(gap.gap_competences[:4]))
            )
        if gap.gap_experience > 0:
            gap.actions_requises.append(
                "Experience insuffisante : +{:.1f} an(s) requis".format(gap.gap_experience)
            )
        if gap.gap_formation > 0:
            gap.actions_requises.append(
                "Niveau de diplome insuffisant ({} niveau(x) manquant(s))".format(gap.gap_formation)
            )

        bonus_manquants = [
            s for s in offre.competences_souhaitees
            if s not in kw.keywords_bonus_present
        ]
        if bonus_manquants:
            gap.actions_souhaitees.append(
                "Competences souhaitees a developper : {}".format(
                    ", ".join(bonus_manquants[:3])
                )
            )

        if scoring.score_global < self.seuil_ats:
            raisons = []
            if gap.gap_competences:
                raisons.append("{} competence(s) cle(s) manquante(s)".format(len(gap.gap_competences)))
            if gap.gap_experience > 0:
                raisons.append("{:.0f} an(s) d'experience insuffisant".format(gap.gap_experience))
            if gap.gap_formation > 0:
                raisons.append("niveau de diplome insuffisant")
            gap.motif_rejet = " | ".join(raisons) if raisons else "score global insuffisant"

        return gap

    def score_cv(
        self,
        cv: CVExtrait,
        offre: OffreInput,
        config: ScoringConfig,
        candidature_id: str = "",
    ) -> ATSRankEntry:
        t0 = time.perf_counter()

        scoring  = cv_scorer.scorer(cv, offre, config)
        keywords = self._analyze_keywords(cv, offre)
        gap      = self._analyze_gaps(cv, offre, scoring, keywords)

        score_final = scoring.score_global
        if keywords.keyword_coverage_pct >= 80 and score_final < 95:
            score_final = min(100, score_final + 3)
        elif keywords.keyword_coverage_pct <= 20 and score_final > 20:
            score_final = max(0, score_final - 5)

        dt_ms = (time.perf_counter() - t0) * 1000

        return ATSRankEntry(
            rang                   = 0,
            candidature_id         = candidature_id,
            candidat_nom           = cv.candidat_nom,
            candidat_email         = cv.candidat_email,
            score_global           = score_final,
            score_competences      = scoring.score_competences_pct,
            score_experience       = float(scoring.score_experience),
            score_formation        = scoring.score_formation_pct,
            score_semantique       = scoring.score_semantique_pct,
            recommandation         = scoring.recommandation,
            keyword_coverage       = keywords.keyword_coverage_pct,
            ats_passthrough        = (score_final >= self.seuil_ats),
            competences_detectees  = scoring.competences_detectees,
            competences_manquantes = scoring.competences_manquantes,
            gap                    = gap,
            keywords               = keywords,
            temps_scoring_ms       = round(dt_ms, 2),
            details                = scoring,
        )

    def match_offre(
        self,
        offre: OffreInput,
        candidatures: List[dict],
        config: ScoringConfig,
        shortlist_max: int = ATS_SHORTLIST_MAX,
    ) -> ATSShortlist:
        log.info(f"[ATS] Matching '{offre.intitule[:50]}' — {len(candidatures)} candidats "
                 f"| seuil_ats={self.seuil_ats} seuil_shortlist={self.seuil_shortlist}")

        pool: List[ATSRankEntry] = []

        for cand in candidatures:
            try:
                texte = cand.get('cvTexte', '') or ''

                exp_annees = _extract_exp_from_texte(
                    texte,
                    score_exp_fallback=0,
                )

                cv = CVExtrait(
                    candidat_nom   = f"{cand.get('prenom', '')} {cand.get('nom', '')}".strip(),
                    candidat_email = cand.get('email', ''),
                    competences    = cand.get('competencesDetectees', []),
                    experience_annees = exp_annees,
                    texte_brut     = texte,
                )

                entry = self.score_cv(
                    cv,
                    offre,
                    config,
                    candidature_id=cand.get('id', ''),
                )

                pool.append(entry)

            except Exception as e:
                log.warning(f"[ATS] Erreur scoring candidat {cand.get('id')}: {e}")
                continue

        if not pool:
            return ATSShortlist(
                offre_id=offre.id,
                offre_intitule=offre.intitule,
                n_candidats_evalues=0,
                n_ats_pass=0,
                n_shortlist=0,
                seuil_utilise=self.seuil_ats,
            )

        pool.sort(key=lambda e: (e.score_global, e.keyword_coverage), reverse=True)
        for rang, entry in enumerate(pool, start=1):
            entry.rang = rang

        ats_pass  = [e for e in pool if e.ats_passthrough]
        shortlist = [e for e in ats_pass if e.score_global >= self.seuil_shortlist][:shortlist_max]

        scores_all = [e.score_global for e in pool]
        stats = {
            "score_moyen":      round(float(np.mean(scores_all)), 2),
            "score_median":     round(float(np.median(scores_all)), 2),
            "score_max":        int(max(scores_all)),
            "score_min":        int(min(scores_all)),
            "score_std":        round(float(np.std(scores_all)), 2),
            "n_fort":           sum(1 for s in scores_all if s >= ATS_SEUIL_FORT),
            "n_bon":            sum(1 for s in scores_all if self.seuil_shortlist <= s < ATS_SEUIL_FORT),
            "n_moyen":          sum(1 for s in scores_all if self.seuil_ats <= s < self.seuil_shortlist),
            "n_faible":         sum(1 for s in scores_all if s < self.seuil_ats),
            "taux_passthrough": round(len(ats_pass) / max(len(pool), 1) * 100, 1),
            "taux_shortlist":   round(len(shortlist) / max(len(pool), 1) * 100, 1),
            "temps_total_ms":   round(sum(e.temps_scoring_ms for e in pool), 1),
        }

        log.info(
            f"[ATS] Termine — ATS pass: {len(ats_pass)} | "
            f"Shortlist: {len(shortlist)} | Score moy: {stats['score_moyen']}"
        )

        return ATSShortlist(
            offre_id            = offre.id,
            offre_intitule      = offre.intitule,
            n_candidats_evalues = len(pool),
            n_ats_pass          = len(ats_pass),
            n_shortlist         = len(shortlist),
            seuil_utilise       = self.seuil_shortlist,
            shortlist           = shortlist,
            pool_complet        = pool,
            stats               = stats,
        )


# =============================================================================
# 5. FONCTION PUBLIQUE
# =============================================================================

def rank_candidates(
    candidatures: List[dict],
    offre: OffreInput,
    config: ScoringConfig,
    top_n: int = ATS_SHORTLIST_MAX,
) -> ATSShortlist:
    """
    Point d'entree principal pour le router ATS.

    Fix 5 : utilise config.seuil_matching (defini par l'admin) au lieu des
    constantes fixes ATS_SEUIL_PASSTHROUGH / ATS_SEUIL_SHORTLIST.

    seuil_ats       = max(30, config.seuil_matching - 20)
    seuil_shortlist = config.seuil_matching
    """
    seuil_shortlist = config.seuil_matching
    seuil_ats       = max(30, config.seuil_matching - 20)

    log.info(
        f"[rank_candidates] seuil_matching admin={config.seuil_matching} "
        f"-> seuil_ats={seuil_ats}, seuil_shortlist={seuil_shortlist}"
    )

    engine = ATSEngine(
        config          = config,
        seuil_ats       = seuil_ats,
        seuil_shortlist = seuil_shortlist,
    )
    return engine.match_offre(offre, candidatures, config, shortlist_max=top_n)