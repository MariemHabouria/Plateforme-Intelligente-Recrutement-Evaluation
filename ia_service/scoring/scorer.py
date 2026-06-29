# ia_service/scoring/scorer.py
# Modèle retenu en production : M3 Hybride (55% pondéré + 45% embeddings)
#
# Décision basée sur la comparaison Couche 2 du notebook cv_model_comparison.ipynb :
# M3 obtient le MAE minimal et le Pearson r maximal sur le dataset d'évaluation.
# Les modèles M1 et M2 existent uniquement dans le notebook pour la comparaison.
#
# ── CHANGELOG v1.1 ────────────────────────────────────────────────────────────
# Fix 1 : _score_experience — pénalité domaine via similarité TF.
#          Un CV full-stack positionné sur un poste pharma/finance/autre domaine
#          ne peut plus obtenir 100% d'expérience sur la seule base du nombre d'années.
#
# Fix 2 : _score_pondere — plafond "désalignement domaine".
#          Si sémantique TF < 0.20 ET compétences < 0.20 → score M1 plafonné à 35.
#          Si sémantique TF < 0.30 ET compétences < 0.40 → score M1 plafonné à 55.
#
# Fix 3 : score_semantique_pct — remplace max(TF, embedding) par moyenne pondérée.
#          Empêche le score d'affichage de masquer un signal TF très bas.
#
# Fix 4 : flag domain_mismatch exposé dans ResultatScoring pour l'UI.
# ─────────────────────────────────────────────────────────────────────────────

import re
import math
import logging
import unicodedata
from typing import List, Tuple, Optional

import numpy as np

log = logging.getLogger("ia_service.scorer")

# Import conditionnel SentenceTransformer
try:
    from sentence_transformers import SentenceTransformer
    _embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    HAS_EMBEDDINGS = True
    log.info("SentenceTransformer chargé (M2 embeddings actif)")
except Exception as e:
    HAS_EMBEDDINGS = False
    log.warning(f"SentenceTransformer non disponible: {e} — fallback cosinus TF uniquement")

from ..schemas import CVExtrait, OffreInput, ResultatScoring, ScoreDetail
from ..config.scoring_config import ScoringConfig

# ── Constantes métier ─────────────────────────────────────────────────────────
NIVEAUX_DIPLOME = {
    'bac': 1, 'bac+2': 3, 'bts': 3, 'dut': 3,
    'licence': 4, 'bac+3': 4, 'bachelor': 4,
    'master': 5, 'bac+5': 5, 'mba': 5, 'ingenieur': 5,
    'doctorat': 6, 'phd': 6,
}
FORMATION_MIN = {
    'TECHNICIEN': 'bac+2', 'EMPLOYE': 'bac+2',
    'CADRE_DEBUTANT': 'bac+3', 'CADRE_CONFIRME': 'bac+5',
    'CADRE_SUPERIEUR': 'bac+5', 'STRATEGIQUE': 'bac+5',
}

POIDS_M1 = 0.55  # Part du scoring pondéré dans le modèle hybride
POIDS_M2 = 0.45  # Part du scoring embeddings

# ── Seuils de désalignement domaine (Fix 1 & 2) ──────────────────────────────
# Seuil de similarité TF en dessous duquel on considère un désalignement domaine
DOMAIN_MISMATCH_HARD  = 0.15   # désalignement fort  → facteur exp × 0.30, plafond M1 à 35
DOMAIN_MISMATCH_SOFT  = 0.30   # désalignement modéré → facteur exp × 0.60, plafond M1 à 55
DOMAIN_COMP_THRESHOLD = 0.40   # seuil compétences requis pour activer le plafond soft


# ── Utilitaires ───────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    """Normalise une chaîne pour la comparaison (minuscules, sans accents)."""
    t = unicodedata.normalize('NFD', s.lower().strip())
    return re.sub(r'[\u0300-\u036f]', '', t)


def _niveau_diplome(libelle: str) -> int:
    n = _norm(libelle)
    for cle, val in sorted(NIVEAUX_DIPLOME.items(), key=lambda x: -len(x[0])):
        if cle in n:
            return val
    return 0


def _cosine_tf(t1: str, t2: str) -> float:
    """Similarité cosinus TF (fallback si SentenceTransformer absent)."""
    STOP = {'les', 'des', 'une', 'que', 'qui', 'pour', 'dans', 'avec', 'sur', 'par',
            'est', 'son', 'ses', 'the', 'and', 'for', 'with', 'that', 'are', 'was'}

    def tf(t):
        mots = [m for m in re.findall(r'\b\w{3,}\b', _norm(t)) if m not in STOP]
        freq = {}
        for m in mots:
            freq[m] = freq.get(m, 0) + 1
        tot = sum(freq.values()) or 1
        return {k: v / tot for k, v in freq.items()}

    v1, v2 = tf(t1), tf(t2)
    communs = set(v1) & set(v2)
    if not communs:
        return 0.0
    dot = sum(v1[m] * v2[m] for m in communs)
    n1 = math.sqrt(sum(v ** 2 for v in v1.values()))
    n2 = math.sqrt(sum(v ** 2 for v in v2.values()))
    return dot / (n1 * n2) if n1 * n2 > 0 else 0.0


def _build_cv_text(cv: CVExtrait) -> str:
    parts = [cv.candidat_nom] + cv.competences

    for d in cv.diplomes:
        if isinstance(d, dict):
            diplome = d.get('diplome', '') or ''
            institution = d.get('institution', '') or ''
            if diplome or institution:
                parts.append(f"{diplome} {institution}".strip())
        elif isinstance(d, str) and d:
            parts.append(d)

    for e in cv.postes_occupes:
        if isinstance(e, dict):
            title = e.get('title', '') or ''
            if title:
                parts.append(title)
        elif isinstance(e, str) and e:
            parts.append(e)

    parts += cv.certifications + cv.langues + cv.soft_skills
    if cv.texte_brut:
        parts.append(cv.texte_brut[:3000])
    return ' '.join(p for p in parts if p)


def _build_offre_text(offre: OffreInput) -> str:
    return ' '.join(filter(None, [
        offre.intitule, offre.description, offre.profil_recherche,
        ' '.join(offre.competences), ' '.join(offre.competences_souhaitees),
        offre.formation_requise,
    ]))


def _build_cv_domain_text(cv: CVExtrait) -> str:
    """
    Construit un texte centré sur le domaine métier du CV :
    titres de postes + compétences uniquement (sans nom, diplômes, langues).
    Utilisé pour le calcul de la pénalité domaine dans _score_experience.
    """
    parts = list(cv.competences)
    for e in cv.postes_occupes:
        if isinstance(e, dict):
            title = e.get('title', '') or ''
            desc  = e.get('description', '') or ''
            if title:
                parts.append(title)
            if desc:
                parts.append(desc[:300])
        elif isinstance(e, str) and e:
            parts.append(e)
    if cv.texte_brut:
        # Prendre seulement les 1500 premiers caractères du brut pour éviter
        # que la formation (présente en bas du CV) dilue le signal domaine
        parts.append(cv.texte_brut[:1500])
    return ' '.join(p for p in parts if p)


# ── Composantes du scoring ────────────────────────────────────────────────────

class CVScorer:
    """
    Modèle de scoring CV ↔ Offre retenu en production : M3 Hybride.

    Architecture :
      score_final = 0.55 × score_pondere_5criteres + 0.45 × score_embedding_semantique

    Les poids des 5 critères sont configurables par le Super Admin depuis la BDD
    (table ScoringConfig). La pondération M1/M2 (55/45) est fixe.
    """

    def __init__(self):
        self._embedding_model = _embedding_model if HAS_EMBEDDINGS else None

    # ── Composante M1 : scoring pondéré 5 critères ────────────────────────────

    def _score_competences(
        self, cv: CVExtrait, offre: OffreInput
    ) -> Tuple[float, List[str], List[str], List[str]]:
        cv_s = {_norm(s) for s in cv.competences}
        detectees  = [s for s in offre.competences if _norm(s) in cv_s]
        manquantes = [s for s in offre.competences if _norm(s) not in cv_s]
        bonus      = [s for s in offre.competences_souhaitees if _norm(s) in cv_s]

        taux_req = len({_norm(s) for s in offre.competences} & cv_s) / max(len(offre.competences), 1)
        taux_sou = len({_norm(s) for s in offre.competences_souhaitees} & cv_s) / max(len(offre.competences_souhaitees), 1) \
                   if offre.competences_souhaitees else 0.0

        score = taux_req * 0.80 + taux_sou * 0.20
        return score, detectees, manquantes, bonus

    def _score_experience(self, cv: CVExtrait, offre: OffreInput) -> float:
        """
        Score l'expérience professionnelle en tenant compte :
        1. Du ratio années_CV / années_requises (quantitatif)
        2. De la pertinence domaine via similarité TF (qualitatif) — Fix 1

        Sans la pénalité domaine, un dev full-stack avec 9 ans obtenait 100%
        sur un poste pharma exigeant 3 ans. La similarité TF détecte l'écart
        et bride le score quantitatif proportionnellement.
        """
        req, act = offre.experience_min_annees, cv.experience_annees
        if req <= 0:
            return 1.0
        if act <= 0:
            return 0.15

        # Score quantitatif pur (inchangé)
        r = act / req
        if r >= 1.0:
            score_quantitatif = min(1.0 + min(0.05 * (r - 1), 0.10), 1.0)
        else:
            score_quantitatif = r ** 1.5

        # ── Pénalité domaine (Fix 1) ──────────────────────────────────────────
        # Calcul de la similarité TF entre le domaine métier du CV et l'offre.
        # On utilise _build_cv_domain_text (titres postes + compétences) et non
        # le texte brut complet, pour éviter que le nom de la formation
        # ("Ingénieur Informatique") biaise le signal domaine.
        offre_text = offre.intitule + ' ' + (offre.description or '') + ' ' + (offre.profil_recherche or '')
        cv_domain_text = _build_cv_domain_text(cv)
        sem_domaine = _cosine_tf(cv_domain_text, offre_text)

        if sem_domaine < DOMAIN_MISMATCH_HARD:
            # Désalignement fort : domaines clairement différents (ex: dev → pharma)
            # On bride à 30% du score quantitatif
            facteur = 0.30
            log.debug(
                f"[_score_experience] Désalignement FORT (sem_TF={sem_domaine:.3f} < {DOMAIN_MISMATCH_HARD}) "
                f"→ facteur {facteur} appliqué sur score_exp={score_quantitatif:.3f}"
            )
        elif sem_domaine < DOMAIN_MISMATCH_SOFT:
            # Désalignement modéré
            facteur = 0.60
            log.debug(
                f"[_score_experience] Désalignement MODÉRÉ (sem_TF={sem_domaine:.3f} < {DOMAIN_MISMATCH_SOFT}) "
                f"→ facteur {facteur} appliqué sur score_exp={score_quantitatif:.3f}"
            )
        else:
            # Domaines alignés : pas de pénalité
            facteur = 1.0

        return round(score_quantitatif * facteur, 4)

    def _score_formation(self, cv: CVExtrait, offre: OffreInput) -> float:
        niv_req = NIVEAUX_DIPLOME.get(
            FORMATION_MIN.get(offre.niveau_poste.upper(), 'bac+3'), 4
        )
        if offre.formation_requise:
            niv_specifique = _niveau_diplome(offre.formation_requise)
            if niv_specifique > 0:
                niv_req = niv_specifique

        niveaux = []
        for d in cv.diplomes:
            if isinstance(d, dict):
                libelle = f"{d.get('diplome', '') or ''} {d.get('niveau', '') or ''}".strip()
            elif isinstance(d, str):
                libelle = d
            else:
                libelle = ''
            if libelle:
                niveaux.append(_niveau_diplome(libelle))

        niv_cv = max(niveaux) if niveaux else 0

        if niv_cv == 0:
            return 0.20
        if niv_cv >= niv_req:
            return 1.0
        return max(0.0, 1.0 - (niv_req - niv_cv) * 0.20)

    def _score_completude(self, cv: CVExtrait) -> float:
        pts = (
            bool(cv.candidat_nom)          * 1.0 +
            bool(cv.candidat_email)        * 1.0 +
            min(len(cv.competences) / 5, 2.0) +
            bool(cv.experience_annees > 0) * 1.0 +
            bool(cv.diplomes)              * 1.5 +
            bool(cv.postes_occupes)        * 1.5 +
            bool(cv.langues)               * 0.5 +
            bool(cv.certifications)        * 0.5
        )
        return min(pts / 9.0, 1.0)

    def _score_semantique_m1(self, cv: CVExtrait, offre: OffreInput) -> float:
        """Score sémantique TF-cosinus (utilisé dans la composante M1)."""
        t_cv    = cv.texte_brut or ' '.join(cv.competences)
        t_offre = _build_offre_text(offre)
        sim = _cosine_tf(t_cv, t_offre)
        if _norm(offre.intitule) in _norm(t_cv):
            sim = min(sim + 0.15, 1.0)
        return sim

    def _score_pondere(self, cv: CVExtrait, offre: OffreInput, config: ScoringConfig) -> Tuple[float, dict]:
        """
        Composante M1 : scoring pondéré sur 5 critères configurables.

        Fix 2 : plafond de désalignement domaine.
        Si le signal sémantique TF ET le score compétences sont tous deux faibles,
        on plafonne le score M1 pour empêcher que l'expérience ou la formation
        élevées compensent un désalignement métier évident.
        """
        s_comp, det, man, bon = self._score_competences(cv, offre)
        s_exp   = self._score_experience(cv, offre)
        s_form  = self._score_formation(cv, offre)
        s_sem   = self._score_semantique_m1(cv, offre)
        s_compl = self._score_completude(cv)

        scores = {
            'competences_techniques': s_comp,
            'experience':             s_exp,
            'formation':              s_form,
            'semantique':             s_sem,
            'completude':             s_compl,
        }

        agg = sum(scores[k] * config.poids[k] for k in config.poids)

        # Bonus/malus cohérence globale (inchangé)
        forts = sum(1 for v in scores.values() if v >= 0.7)
        if forts >= 4:
            agg = min(agg * 1.08, 1.0)
        elif forts <= 1:
            agg *= 0.90

        # ── Plafond désalignement domaine (Fix 2) ─────────────────────────────
        # Déclenché uniquement si sémantique ET compétences sont toutes deux faibles.
        # La conjonction évite de pénaliser les CVs sur-qualifiés en compétences
        # dont le texte serait mal rédigé (faux négatif sémantique).
        domain_mismatch = False

        if s_sem < DOMAIN_MISMATCH_HARD and s_comp < 0.20:
            # Désalignement fort confirmé : pharma → dev, finance → industrie, etc.
            agg = min(agg, 0.35)
            domain_mismatch = True
            log.info(
                f"[_score_pondere] Plafond FORT activé "
                f"(s_sem={s_sem:.3f}, s_comp={s_comp:.3f}) → agg plafonné à 0.35"
            )
        elif s_sem < DOMAIN_MISMATCH_SOFT and s_comp < DOMAIN_COMP_THRESHOLD:
            # Désalignement modéré : domaines proches mais profil inadapté
            agg = min(agg, 0.55)
            domain_mismatch = True
            log.info(
                f"[_score_pondere] Plafond MODÉRÉ activé "
                f"(s_sem={s_sem:.3f}, s_comp={s_comp:.3f}) → agg plafonné à 0.55"
            )

        return agg, {
            'scores_detail':   scores,
            'detectees':       det,
            'manquantes':      man,
            'bonus':           bon,
            'domain_mismatch': domain_mismatch,
            'sem_domaine_tf':  s_sem,
        }

    # ── Composante M2 : embeddings sémantiques ────────────────────────────────

    def _encode(self, text: str) -> np.ndarray:
        if self._embedding_model:
            emb = self._embedding_model.encode(text[:6000], convert_to_numpy=True)
            return emb / (np.linalg.norm(emb) + 1e-8)
        # Fallback TF vectoriel simple
        words = re.findall(r'\b\w{3,}\b', _norm(text))
        vocab = sorted(set(words))
        if not vocab:
            return np.zeros(1)
        vec = np.array([words.count(w) / len(words) for w in vocab])
        return vec / (np.linalg.norm(vec) + 1e-8)

    def _score_embedding(self, cv: CVExtrait, offre: OffreInput) -> float:
        """Composante M2 : similarité cosinus via SentenceTransformer."""
        e_cv    = self._encode(_build_cv_text(cv))
        e_offre = self._encode(_build_offre_text(offre))
        n = min(len(e_cv), len(e_offre))
        cosine = float(np.dot(e_cv[:n], e_offre[:n]))
        # Cosinus ∈ [-1, 1] → score ∈ [0, 100]
        return max(0.0, min(100.0, (cosine + 1) * 50))

    # ── Score hybride M3 (point d'entrée principal) ───────────────────────────

    def scorer(self, cv: CVExtrait, offre: OffreInput, config: ScoringConfig) -> ResultatScoring:
        """
        Calcule le score hybride M3 pour une paire CV/Offre.

        score_final = POIDS_M1 × score_pondéré(5 critères) + POIDS_M2 × score_embedding

        Args:
            cv     : CV extrait et parsé
            offre  : Offre d'emploi
            config : Configuration des poids (chargée depuis PostgreSQL)

        Returns:
            ResultatScoring avec tous les détails pour l'affichage SHAP
        """
        # -- M1 : scoring pondéré
        score_m1_raw, m1_details = self._score_pondere(cv, offre, config)
        score_m1 = round(score_m1_raw * 100)

        # -- M2 : embeddings sémantiques
        score_m2 = round(self._score_embedding(cv, offre))

        # -- M3 : combinaison hybride
        score_final = round(
            score_m1 * POIDS_M1 +
            score_m2 * POIDS_M2
        )
        score_final = max(0, min(100, score_final))

        # ── Plafond final désalignement domaine ───────────────────────────────
        # Le plafond Fix 2 s'appliquait uniquement à M1, mais M2 (embeddings)
        # peut compenser un M1 très faible et faire remonter le score final
        # au-delà du plafond voulu (ex : M1 plafonné à 35 mais M2=64 → final=47).
        # On applique donc le même plafond sur le score final hybride.
        #
        # Seuils :
        #   s_sem < 0.15 ET s_comp = 0  → plafond final à 30
        #   s_sem < 0.30 ET s_comp < 0.40 → plafond final à 45
        s_sem_final = m1_details['sem_domaine_tf']
        s_comp_final = m1_details['scores_detail']['competences_techniques']

        # Fix 5 : le plafond ne se déclenche que si l'embedding sémantique (score_m2)
        # confirme aussi le désalignement. Sans cette condition, un profil dont
        # l'expérience IA est formulée avec un vocabulaire différent de l'offre
        # (ex: "Azure Document Intelligence" / "Groq LLama" vs "TensorFlow" / "spaCy")
        # était plafonné même quand l'embedding détectait une vraie pertinence domaine.
        if s_sem_final < DOMAIN_MISMATCH_HARD and s_comp_final < 0.20 and score_m2 < 55:
            score_final = min(score_final, 30)
            log.info(
                f"[scorer] Plafond final FORT appliqué "
                f"(s_sem={s_sem_final:.3f}, s_comp={s_comp_final:.3f}, score_m2={score_m2}) "
                f"→ score_final plafonné à 30"
            )
        elif s_sem_final < DOMAIN_MISMATCH_SOFT and s_comp_final < DOMAIN_COMP_THRESHOLD and score_m2 < 65:
            score_final = min(score_final, 45)
            log.info(
                f"[scorer] Plafond final MODÉRÉ appliqué "
                f"(s_sem={s_sem_final:.3f}, s_comp={s_comp_final:.3f}, score_m2={score_m2}) "
                f"→ score_final plafonné à 45"
            )

        # Récupération des scores détaillés de M1
        sc             = m1_details['scores_detail']
        det            = m1_details['detectees']
        man            = m1_details['manquantes']
        bon            = m1_details['bonus']
        domain_mismatch = m1_details['domain_mismatch']
        sem_tf         = m1_details['sem_domaine_tf']

        recommandation = config.recommandation_label(score_final)

        # ── Fix 3 : score_semantique_pct affiché ─────────────────────────────
        # Ancienne version : max(TF, embedding/100) → masquait un TF bas
        # Nouvelle version : moyenne pondérée 40% TF + 60% embedding
        # Le TF reste influent : si TF=0.34 et embedding=0.73,
        # on affiche 0.34×0.40 + 0.73×0.60 = 0.574 (57%) au lieu de 73%.
        score_sem_affiche = round(
            (sc['semantique'] * 0.40 + (score_m2 / 100) * 0.60) * 100, 1
        )

        # Explainability (SHAP-like) : contributions par critère
        shap = [
            ScoreDetail(
                critere="Compétences requises",
                score=sc['competences_techniques'],
                poids=config.poids['competences_techniques'],
                contribution=round(sc['competences_techniques'] * config.poids['competences_techniques'] * 100, 1),
                positif=sc['competences_techniques'] >= 0.6,
                details=f"{len(det)}/{len(offre.competences)} compétences du poste retrouvées dans le CV",
            ),
            ScoreDetail(
                critere="Expérience professionnelle",
                score=sc['experience'],
                poids=config.poids['experience'],
                contribution=round(sc['experience'] * config.poids['experience'] * 100, 1),
                positif=sc['experience'] >= 0.6,
                details=(
                    f"{cv.experience_annees:.0f} ans d'expérience / {offre.experience_min_annees:.0f} ans demandés"
                    + (" — expérience dans un autre secteur d'activité" if sem_tf < DOMAIN_MISMATCH_SOFT else "")
                ),
            ),
            ScoreDetail(
                critere="Niveau de diplôme",
                score=sc['formation'],
                poids=config.poids['formation'],
                contribution=round(sc['formation'] * config.poids['formation'] * 100, 1),
                positif=sc['formation'] >= 0.8,
                details=f"Diplôme requis : {offre.formation_requise or 'Non précisé'}",
            ),
            ScoreDetail(
                critere="Correspondance avec le poste",
                score=sc['semantique'],
                poids=config.poids['semantique'],
                contribution=round(sc['semantique'] * config.poids['semantique'] * 100, 1),
                positif=sc['semantique'] >= 0.5,
                details=f"Taux de correspondance entre le profil et la fiche de poste : {sc['semantique']:.0%}",
            ),
            ScoreDetail(
                critere="Complétude du dossier",
                score=sc['completude'],
                poids=config.poids['completude'],
                contribution=round(sc['completude'] * config.poids['completude'] * 100, 1),
                positif=sc['completude'] >= 0.7,
                details="Présence des informations clés dans le CV (coordonnées, diplômes, postes, langues…)",
            ),
            ScoreDetail(
                critere="Cohérence globale du profil",
                score=score_m2 / 100,
                poids=POIDS_M2,
                contribution=round(score_m2 * POIDS_M2, 1),
                positif=score_m2 >= 55,
                details=f"Analyse approfondie du langage et du parcours : {score_m2}/100",
            ),
        ]
        return ResultatScoring(
            score_global=score_final,
            score_experience=round(sc['experience'] * 100),
            competences_detectees=det,
            competences_manquantes=man,
            score_competences_pct=round(sc['competences_techniques'] * 100, 1),
            score_formation_pct=round(sc['formation'] * 100, 1),
            # Fix 3 : moyenne pondérée TF+embedding au lieu de max()
            score_semantique_pct=score_sem_affiche,
            score_completude_pct=round(sc['completude'] * 100, 1),
            competences_bonus=bon,
            shap_details=shap,
            recommandation=recommandation,
            eligible_matching_inverse=(score_final >= config.seuil_matching),
            version_modele="M3-Hybride-v1.1",
            # Fix 4 : flag exposé pour l'UI (bandeau d'avertissement domaine)
            domain_mismatch=domain_mismatch,
        )


# Singleton — instancié une seule fois au démarrage du microservice
cv_scorer = CVScorer()