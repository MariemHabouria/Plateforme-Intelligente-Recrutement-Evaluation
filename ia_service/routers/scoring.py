# ia_service/routers/scoring.py
# CHANGELOG v1.2 :
# Fix 5a : ajout "Ingenieur IA / Machine Learning" dans _SEED_OFFRES
# Fix 5b : endpoint matching-inverse retourne seuil_utilise dans la reponse
# Fix 5c : _fetch_offre utilise les donnees BDD en priorite pour description/profilRecherche

import os
import json
import secrets
import logging
import asyncpg
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks, Form, UploadFile, File

from ..schemas import (
    ScoringRequest, ScoringResponse,
    MatchingInverseRequest, MatchingInverseResponse,
    ParseCVRequest, ParseCVResponse,
    CVExtrait, OffreInput,
)
from ..cv_extractor.parser import parse_cv
from ..scoring.scorer import cv_scorer
from ..ats.ats_engine import rank_candidates
from ..config.scoring_config import get_config, refresh_config, DEV_MODE

log = logging.getLogger("ia_service.routers")
router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:mariem@localhost:5432/kilani_rh")

IA_SECRET = os.getenv("IA_SECRET_KEY", "")


async def require_internal(x_internal_key: str = Header(default="")):
    if IA_SECRET and not secrets.compare_digest(x_internal_key, IA_SECRET):
        raise HTTPException(status_code=403, detail="Acces non autorise")


UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/uploads")).resolve()


def _validate_cv_path(cv_path: str) -> Path:
    try:
        p = Path(cv_path).resolve()
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Chemin CV invalide : {e}")

    if not p.is_relative_to(UPLOAD_DIR):
        log.warning(f"Tentative de path traversal bloquee : {cv_path!r} -> {p}")
        raise HTTPException(
            status_code=400,
            detail=f"Chemin CV non autorise (doit etre dans {UPLOAD_DIR})"
        )
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Fichier CV introuvable : {p.name}")
    if p.suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptes")

    return p


# ── Catalogue seed ────────────────────────────────────────────────────────────
_SEED_OFFRES: Dict[str, Dict] = {
    "Technicien de laboratoire": {
        "competences": ["BPF", "HPLC", "Controle qualite", "Microbiologie"],
        "competences_souhaitees": ["GMP", "ISO 9001", "Spectrophotometrie"],
        "description": "Realiser les analyses physico-chimiques et microbiologiques des matieres premieres et produits finis dans le respect des BPF.",
        "profil_recherche": "Technicien avec experience en laboratoire pharmaceutique, rigueur et sens du detail requis.",
        "niveau_poste": "TECHNICIEN",
        "experience_min_annees": 1.0,
        "formation_requise": "Bac+2",
    },
    "Pharmacien AQ": {
        "competences": ["Assurance qualite", "BPF", "Audit interne", "Gestion des deviations", "Redaction SOP"],
        "competences_souhaitees": ["ICH Q10", "Affaires reglementaires", "SAP QM"],
        "description": "Garantir la conformite des processus de fabrication aux referentiels BPF et aux exigences reglementaires.",
        "profil_recherche": "Pharmacien avec 3+ ans en AQ industrielle, maitrise des audits et de la documentation qualite.",
        "niveau_poste": "CADRE_DEBUTANT",
        "experience_min_annees": 3.0,
        "formation_requise": "Bac+5",
    },
    "Responsable Production Pharma": {
        "competences": ["Management equipe", "Planification production", "BPF", "Lean Manufacturing", "KPI industriels"],
        "competences_souhaitees": ["Six Sigma", "ERP SAP", "Validation procedes"],
        "description": "Superviser l'ensemble des operations de production pharmaceutique tout en assurant la conformite qualite et les delais.",
        "profil_recherche": "Ingenieur ou pharmacien avec 5+ ans en production pharmaceutique et experience en management.",
        "niveau_poste": "CADRE_SUPERIEUR",
        "experience_min_annees": 5.0,
        "formation_requise": "Bac+5",
    },
    "Directeur Industriel": {
        "competences": ["Direction industrielle", "Strategie industrielle", "Management senior", "Budget CAPEX/OPEX", "BPF", "Relations institutionnelles"],
        "competences_souhaitees": ["Expansion internationale", "Fusions-acquisitions", "CSRD"],
        "description": "Piloter la strategie industrielle du groupe, superviser les sites de production et garantir la competitivite operationnelle.",
        "profil_recherche": "Dirigeant avec 10+ ans d'experience en industrie pharmaceutique, vision strategique et leadership avere.",
        "niveau_poste": "STRATEGIQUE",
        "experience_min_annees": 10.0,
        "formation_requise": "Bac+5",
    },
    "Technicien Support IT": {
        "competences": ["Support N1/N2", "Active Directory", "Windows 10/11", "Ticketing GLPI"],
        "competences_souhaitees": ["ITIL", "Office 365", "Reseau TCP/IP"],
        "description": "Assurer le support informatique des utilisateurs du groupe, gerer le parc materiel et maintenir les postes de travail.",
        "profil_recherche": "Technicien informatique avec 1+ an d'experience en support utilisateur.",
        "niveau_poste": "EMPLOYE",
        "experience_min_annees": 1.0,
        "formation_requise": "Bac+2",
    },
    "Developpeur Full Stack": {
        "competences": ["React", "Node.js", "TypeScript", "PostgreSQL", "REST API"],
        "competences_souhaitees": ["Docker", "CI/CD", "GraphQL", "Redis"],
        "description": "Developper et maintenir les applications metier du groupe dans un environnement Agile.",
        "profil_recherche": "Developpeur passionne, 3+ ans d'experience full stack, bon esprit d'equipe.",
        "niveau_poste": "CADRE_DEBUTANT",
        "experience_min_annees": 3.0,
        "formation_requise": "Bac+3",
    },
    # Fix 5a : alias pour matcher l'intitule exact en BDD
    "Développeur Full Stack": {
        "competences": ["React", "Node.js", "TypeScript", "PostgreSQL", "REST API"],
        "competences_souhaitees": ["Docker", "CI/CD", "GraphQL", "Redis"],
        "description": "Developper et maintenir les applications metier du groupe dans un environnement Agile.",
        "profil_recherche": "Developpeur passionne, 3+ ans d'experience full stack, bon esprit d'equipe.",
        "niveau_poste": "CADRE_DEBUTANT",
        "experience_min_annees": 3.0,
        "formation_requise": "Bac+3",
    },
    "Chef de Projet SI": {
        "competences": ["Gestion de projet", "Methodes Agile/SCRUM", "Cahier des charges", "ERP", "Conduite du changement"],
        "competences_souhaitees": ["PMP", "PRINCE2", "SAP", "Budget SI"],
        "description": "Piloter les projets de transformation digitale du groupe de l'expression du besoin a la mise en production.",
        "profil_recherche": "Chef de projet avec 5+ ans d'experience en environnement multi-sites, forte capacite de communication.",
        "niveau_poste": "CADRE_CONFIRME",
        "experience_min_annees": 5.0,
        "formation_requise": "Bac+5",
    },
    "Directeur des Systemes d'Information": {
        "competences": ["Strategie SI", "Architecture d'entreprise", "Cybersecurite", "Budget IT", "Cloud Azure/AWS", "Management DSI"],
        "competences_souhaitees": ["TOGAF", "ISO 27001", "FinOps", "IA generative"],
        "description": "Definir et piloter la strategie SI du groupe Kilani, garantir la securite du systeme d'information et accompagner la transformation digitale.",
        "profil_recherche": "DSI confirme avec 10+ ans d'experience, vision strategique et capacite a porter la transformation numerique.",
        "niveau_poste": "CADRE_SUPERIEUR",
        "experience_min_annees": 10.0,
        "formation_requise": "Bac+5",
    },
    "Community Manager": {
        "competences": ["Reseaux sociaux", "Creation de contenu", "Canva", "Veille digitale", "Redaction web"],
        "competences_souhaitees": ["Meta Ads", "Google Analytics", "SEO", "Montage video"],
        "description": "Animer et developper la presence digitale du groupe Kilani sur l'ensemble des reseaux sociaux.",
        "profil_recherche": "Creatif, curieux, avec une forte appetence pour le digital et les tendances des reseaux sociaux.",
        "niveau_poste": "CADRE_DEBUTANT",
        "experience_min_annees": 1.0,
        "formation_requise": "Bac+3",
    },
    "Chef de Produit Marketing": {
        "competences": ["Marketing strategique", "Lancement produit", "Etudes de marche", "P&L", "Negociation enseignes"],
        "competences_souhaitees": ["CRM Salesforce", "Trade marketing", "Previsions des ventes", "Nielsen"],
        "description": "Developper et piloter la strategie marketing des gammes pharmaceutiques et paramedicales du groupe.",
        "profil_recherche": "Chef de produit avec 4+ ans en marketing pharmaceutique ou grande consommation.",
        "niveau_poste": "CADRE_CONFIRME",
        "experience_min_annees": 4.0,
        "formation_requise": "Bac+5",
    },
    "Directeur Commercial": {
        "competences": ["Direction commerciale", "Force de vente", "Negociation grands comptes", "CRM", "Developpement business", "Management commercial"],
        "competences_souhaitees": ["Expansion Afrique", "Digital selling", "Revenue Management"],
        "description": "Definir et deployer la strategie commerciale du groupe, piloter les equipes de vente et developper le portefeuille clients.",
        "profil_recherche": "Directeur commercial avec 8+ ans d'experience, track record de croissance en Tunisie et/ou Afrique.",
        "niveau_poste": "CADRE_SUPERIEUR",
        "experience_min_annees": 8.0,
        "formation_requise": "Bac+5",
    },
    "Directeur General Adjoint": {
        "competences": ["Direction generale", "Strategie groupe", "Gouvernance", "Management senior", "Finance groupe", "Relations institutionnelles"],
        "competences_souhaitees": ["M&A", "ESG/CSRD", "Expansion internationale", "Private Equity"],
        "description": "Assister le DG dans le pilotage strategique et operationnel du groupe, superviser les directions fonctionnelles.",
        "profil_recherche": "Dirigeant accompli, 12+ ans d'experience en management de groupe, forte culture financiere et strategique.",
        "niveau_poste": "STRATEGIQUE",
        "experience_min_annees": 12.0,
        "formation_requise": "Bac+5",
    },
    # Fix 5a : offre IA ajoutee au catalogue seed
    "Ingenieur IA / Machine Learning": {
        "competences": ["Python", "TensorFlow", "Scikit-Learn", "spaCy", "FastAPI", "SHAP", "Pandas", "NLP"],
        "competences_souhaitees": ["PyTorch", "HuggingFace", "LLM", "Docker", "MLflow", "Kedro"],
        "description": "Developper et industrialiser des modeles d'intelligence artificielle pour les besoins metier du groupe : scoring de candidatures, matching de talents, analyse semantique de CV et recommandation de profils.",
        "profil_recherche": "Ingenieur IA junior a confirme, diplome Bac+5 en informatique ou data science. Maitrise de Python, TensorFlow / Scikit-Learn, spaCy et FastAPI requise.",
        "niveau_poste": "CADRE_DEBUTANT",
        # 0.0 car profil junior/stage accepte — evite de penaliser Mariem
        "experience_min_annees": 0.0,
        "formation_requise": "Bac+5",
    },
    # Alias avec accent pour matcher l'intitule exact en BDD apres correction encodage
    "Ingénieur IA / Machine Learning": {
        "competences": ["Python", "TensorFlow", "Scikit-Learn", "spaCy", "FastAPI", "SHAP", "Pandas", "NLP"],
        "competences_souhaitees": ["PyTorch", "HuggingFace", "LLM", "Docker", "MLflow", "Kedro"],
        "description": "Developper et industrialiser des modeles d'intelligence artificielle pour les besoins metier du groupe : scoring de candidatures, matching de talents, analyse semantique de CV et recommandation de profils.",
        "profil_recherche": "Ingenieur IA junior a confirme, diplome Bac+5 en informatique ou data science. Maitrise de Python, TensorFlow / Scikit-Learn, spaCy et FastAPI requise.",
        "niveau_poste": "CADRE_DEBUTANT",
        "experience_min_annees": 0.0,
        "formation_requise": "Bac+5",
    },
}


def _offre_from_seed(offre_id: str, intitule: str, reference: str) -> OffreInput:
    data = _SEED_OFFRES.get(intitule)
    if data:
        log.info(f"Offre mock chargee depuis catalogue seed pour intitule '{intitule}'")
        return OffreInput(
            id=offre_id,
            reference=reference,
            intitule=intitule,
            description=data["description"],
            profil_recherche=data["profil_recherche"],
            competences=data["competences"],
            competences_souhaitees=data["competences_souhaitees"],
            type_contrat="CDI",
            niveau_poste=data["niveau_poste"],
            experience_min_annees=data["experience_min_annees"],
            formation_requise=data["formation_requise"],
        )

    log.warning(
        f"Intitule '{intitule}' absent du catalogue seed — "
        f"offre fallback avec 0 competences requises"
    )
    return OffreInput(
        id=offre_id,
        reference=reference,
        intitule=intitule,
        description="",
        profil_recherche="",
        competences=[],
        competences_souhaitees=[],
        type_contrat="CDI",
        niveau_poste="CADRE_CONFIRME",
        experience_min_annees=0.0,
        formation_requise="",
    )


async def _fetch_offre(offre_id: str) -> OffreInput:
    try:
        conn = await asyncpg.connect(DATABASE_URL, timeout=5)
        try:
            row = await conn.fetchrow(
                """
                SELECT
                    o.id,
                    o.reference,
                    o.intitule,
                    o.description,
                    o."profilRecherche",
                    o.competences,
                    o."typeContrat",
                    d.niveau AS niveau_poste
                FROM offres o
                LEFT JOIN demandes d ON d.id = o."demandeId"
                WHERE o.id = $1
                """,
                offre_id,
            )
        finally:
            await conn.close()

        if not row:
            log.warning(f"Offre {offre_id} non trouvee en BDD")
            if DEV_MODE:
                return _offre_from_seed(offre_id, "", f"REF-{offre_id[:8]}")
            raise HTTPException(status_code=404, detail=f"Offre {offre_id} non trouvee")

        def _parse_array(raw: Any) -> List[str]:
            if isinstance(raw, list):
                return [str(c) for c in raw if c]
            if isinstance(raw, str):
                try:
                    return [str(c) for c in json.loads(raw) if c]
                except Exception:
                    return [c.strip() for c in raw.split(',') if c.strip()]
            return []

        intitule    = row['intitule'] or ''
        competences = _parse_array(row['competences'])
        seed_data   = _SEED_OFFRES.get(intitule)

        if not competences and seed_data:
            log.info(f"competences[] vide en BDD pour '{intitule}' — complete depuis seed")
            competences = seed_data["competences"]

        # Fix 5c : BDD en priorite pour description/profilRecherche,
        # seed en fallback si la BDD contient du texte corrompu ou vide
        description_bdd      = row['description'] or ''
        profil_recherche_bdd = row['profilRecherche'] or ''

        description      = description_bdd      if len(description_bdd) > 20      else (seed_data["description"]      if seed_data else '')
        profil_recherche = profil_recherche_bdd if len(profil_recherche_bdd) > 20 else (seed_data["profil_recherche"] if seed_data else '')

        competences_souhaitees = seed_data["competences_souhaitees"] if seed_data else []
        experience_min_annees  = seed_data["experience_min_annees"]  if seed_data else 0.0
        formation_requise      = seed_data["formation_requise"]       if seed_data else ""
        niveau_poste = row['niveau_poste'] or (seed_data["niveau_poste"] if seed_data else "CADRE_CONFIRME")

        log.info(
            f"Offre chargee : '{intitule}' | {len(competences)} competences requises "
            f"| exp_min={experience_min_annees}ans | niveau={niveau_poste}"
        )

        return OffreInput(
            id=str(row['id']),
            reference=row['reference'] or '',
            intitule=intitule,
            description=description,
            profil_recherche=profil_recherche,
            competences=competences,
            competences_souhaitees=competences_souhaitees,
            type_contrat=row['typeContrat'] or 'CDI',
            niveau_poste=niveau_poste,
            experience_min_annees=experience_min_annees,
            formation_requise=formation_requise,
        )

    except asyncpg.PostgresConnectionError as e:
        log.error(f"Erreur connexion PostgreSQL: {e}")
        if DEV_MODE:
            return _offre_from_seed(offre_id, "", f"REF-{offre_id[:8] if offre_id else 'MOCK'}")
        raise HTTPException(status_code=503, detail="Service de base de donnees indisponible")

    except HTTPException:
        raise

    except Exception as e:
        log.error(f"Erreur SQL lors du chargement de l'offre: {e}")
        if DEV_MODE:
            try:
                conn2 = await asyncpg.connect(DATABASE_URL, timeout=5)
                try:
                    minimal = await conn2.fetchrow(
                        "SELECT intitule FROM offres WHERE id = $1", offre_id
                    )
                finally:
                    await conn2.close()
                intitule_found = minimal['intitule'] if minimal else ""
                return _offre_from_seed(offre_id, intitule_found, f"REF-{offre_id[:8]}")
            except Exception as e2:
                log.error(f"Fallback minimal echoue ({e2}) — offre vide")
                return _offre_from_seed(offre_id, "", f"REF-{offre_id[:8] if offre_id else 'MOCK'}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


async def _fetch_candidatures_passives() -> List[Dict[str, Any]]:
    if DEV_MODE and not DATABASE_URL:
        return []

    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            rows = await conn.fetch(
                """
                SELECT id, nom, prenom, email,
                       LEFT("cvTexte", 8000) AS "cvTexte",
                       "cvUrl",
                       "scoreGlobal", "scoreExp",
                       "competencesDetectees", "competencesManquantes"
                FROM candidatures
                ORDER BY "dateSoumission" DESC
                LIMIT 500
                """
            )
        finally:
            await conn.close()

        result = []
        for r in rows:
            def _pa(raw):
                if isinstance(raw, list): return raw
                if isinstance(raw, str):
                    try: return json.loads(raw)
                    except: return []
                return []

            result.append({
                'id':                    str(r['id']),
                'nom':                   r['nom'],
                'prenom':                r['prenom'],
                'email':                 r['email'],
                'cvTexte':               r['cvTexte'] or '',
                'cvUrl':                 r['cvUrl'] or '',
                'scoreGlobal':           float(r['scoreGlobal'] or 0),
                'scoreExp':              float(r['scoreExp'] or 0),
                'competencesDetectees':  _pa(r['competencesDetectees']),
                'competencesManquantes': _pa(r['competencesManquantes']),
            })

        log.info(f"[matching-inverse] {len(result)} candidature(s) chargee(s) depuis BDD")
        return result

    except asyncpg.PostgresConnectionError as e:
        log.error(f"Erreur connexion PostgreSQL (candidatures): {e}")
        if DEV_MODE:
            return []
        raise HTTPException(status_code=503, detail="Service de base de donnees indisponible")

    except Exception as e:
        log.error(f"Erreur inattendue (candidatures): {e}")
        if DEV_MODE:
            return []
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


async def _persist_scoring(candidature_id: str, resultat, cv_texte_brut: str = "") -> None:
    if DEV_MODE or not DATABASE_URL:
        return
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            await conn.execute(
                """
                UPDATE candidatures
                SET "scoreGlobal"           = $1,
                    "scoreExp"              = $2,
                    "competencesDetectees"  = $3,
                    "competencesManquantes" = $4,
                    "cvTexte"               = CASE
                                                WHEN $5 != '' THEN $5
                                                ELSE "cvTexte"
                                             END,
                    "updatedAt"             = NOW()
                WHERE id = $6
                """,
                resultat.score_global,
                resultat.score_experience,
                resultat.competences_detectees,
                resultat.competences_manquantes,
                cv_texte_brut,
                candidature_id,
            )
        finally:
            await conn.close()
    except Exception as e:
        log.error(f"Erreur persistance scoring: {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/scoring", response_model=ScoringResponse)
async def scorer_cv(req: ScoringRequest, background_tasks: BackgroundTasks):
    validated_path = _validate_cv_path(req.cv_path)

    try:
        cv_data = parse_cv(str(validated_path))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Impossible de parser le CV : {e}")

    cv = CVExtrait(
        candidat_nom=cv_data.get('nom') or '',
        candidat_email=cv_data.get('email') or '',
        competences=cv_data.get('competences', []),
        soft_skills=cv_data.get('soft_skills', []),
        experience_annees=cv_data.get('experience_annees', 0.0),
        diplomes=cv_data.get('diplomes', []),
        langues=[l.get('langue', '') if isinstance(l, dict) else str(l)
                 for l in cv_data.get('langues', [])],
        certifications=cv_data.get('certifications', []),
        texte_brut=cv_data.get('texte_brut', ''),
    )

    offre = await _fetch_offre(req.offre_id)
    config = await get_config()
    resultat = cv_scorer.scorer(cv, offre, config)

    if not DEV_MODE:
        background_tasks.add_task(
            _persist_scoring,
            req.candidature_id,
            resultat,
            cv.texte_brut,
        )

    return ScoringResponse(
        success=True,
        candidature_id=req.candidature_id,
        score_global=resultat.score_global,
        score_experience=resultat.score_experience,
        recommandation=resultat.recommandation,
        competences_detectees=resultat.competences_detectees,
        competences_manquantes=resultat.competences_manquantes,
        score_competences_pct=resultat.score_competences_pct,
        score_formation_pct=resultat.score_formation_pct,
        score_semantique_pct=resultat.score_semantique_pct,
        score_completude_pct=resultat.score_completude_pct,
        shap_details=[
            {
                'critere':      s.critere,
                'score':        round(s.score * 100, 1),
                'poids':        round(s.poids * 100, 1),
                'contribution': s.contribution,
                'positif':      s.positif,
                'details':      s.details,
            }
            for s in resultat.shap_details
        ],
        eligible_matching_inverse=resultat.eligible_matching_inverse,
        version_modele=resultat.version_modele,
        domain_mismatch=resultat.domain_mismatch,
        cv_parsed={
            'nom':               cv_data.get('nom'),
            'email':             cv_data.get('email'),
            'telephone':         cv_data.get('telephone'),
            'localisation':      cv_data.get('localisation'),
            'experience_annees': cv_data.get('experience_annees'),
            'competences':       cv_data.get('competences', []),
            'diplomes':          cv_data.get('diplomes', []),
            'langues':           cv_data.get('langues', []),
        },
    )


@router.post("/matching-inverse", response_model=MatchingInverseResponse)
async def matching_inverse(req: MatchingInverseRequest):
    log.info(f"Matching inverse request recu pour offre {req.offre_id}")

    offre        = await _fetch_offre(req.offre_id)
    candidatures = await _fetch_candidatures_passives()

    if not candidatures:
        return MatchingInverseResponse(
            success=True, offre_id=req.offre_id,
            n_candidats_total=0, n_shortlist=0, shortlist=[],
        )

    config           = await get_config()
    shortlist_result = rank_candidates(candidatures, offre, config, top_n=req.top_n)

    log.info(
        f"Matching termine: {shortlist_result.n_candidats_evalues} candidats evalues, "
        f"{shortlist_result.n_shortlist} en shortlist "
        f"(seuil={shortlist_result.seuil_utilise})"
    )

    return MatchingInverseResponse(
        success=True,
        offre_id=req.offre_id,
        n_candidats_total=shortlist_result.n_candidats_evalues,
        n_shortlist=shortlist_result.n_shortlist,
        # Fix 5b : retourne le seuil reel utilise pour que le frontend l'affiche
        seuil_utilise=shortlist_result.seuil_utilise,
        shortlist=[
            {
                'candidature_id':         r.candidature_id,
                'candidat_nom':           r.candidat_nom,
                'candidat_email':         r.candidat_email,
                'score_global':           r.score_global,
                'score_experience':       int(r.score_experience),
                'competences_detectees':  r.competences_detectees,
                'competences_manquantes': r.competences_manquantes,
                'recommandation':         r.recommandation,
                'eligible':               r.gap.profil_eligible if hasattr(r, 'gap') else False,
                'rang':                   r.rang,
            }
            for r in shortlist_result.shortlist
        ],
    )


@router.post("/parse-cv", response_model=ParseCVResponse)
async def parse_cv_endpoint(req: ParseCVRequest):
    validated_path = _validate_cv_path(req.cv_path)

    try:
        cv_data = parse_cv(str(validated_path))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Erreur parsing : {e}")

    return ParseCVResponse(
        success=True,
        nom=cv_data.get('nom'),
        email=cv_data.get('email'),
        telephone=cv_data.get('telephone'),
        localisation=cv_data.get('localisation'),
        competences=cv_data.get('competences', []),
        soft_skills=cv_data.get('soft_skills', []),
        experience_annees=cv_data.get('experience_annees', 0.0),
        diplomes=cv_data.get('diplomes', []),
        langues=cv_data.get('langues', []),
        certifications=cv_data.get('certifications', []),
    )


@router.post("/refresh-config", dependencies=[Depends(require_internal)])
async def refresh_scoring_config():
    config = await refresh_config()
    return {
        "success": True,
        "message": "Configuration rechargee avec succes",
        "config": {
            "poids_competences": config.poids_competences,
            "poids_experience":  config.poids_experience,
            "poids_formation":   config.poids_formation,
            "poids_semantique":  config.poids_semantique,
            "poids_completude":  config.poids_completude,
            "seuil_matching":    config.seuil_matching,
        },
    }


@router.get("/debug/config", dependencies=[Depends(require_internal)])
async def debug_config():
    config = await get_config()
    return {
        "dev_mode":    DEV_MODE,
        "database_url": (DATABASE_URL[:20] + "...") if DATABASE_URL else None,
        "config": {
            "poids_competences": config.poids_competences,
            "poids_experience":  config.poids_experience,
            "poids_formation":   config.poids_formation,
            "poids_semantique":  config.poids_semantique,
            "poids_completude":  config.poids_completude,
            "seuil_matching":    config.seuil_matching,
        },
    }


@router.post("/import-candidature")
async def import_candidature(
    offre_id: str = Form(...),
    nom: str = Form(...),
    prenom: str = Form(...),
    email: str = Form(...),
    telephone: str = Form(None),
    cv_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    import tempfile
    import shutil
    import uuid

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(cv_file.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        cv_data = parse_cv(tmp_path)
        candidature_id = str(uuid.uuid4())
        reference = f"CAND-{uuid.uuid4().hex[:8].upper()}"

        conn = await asyncpg.connect(DATABASE_URL)
        try:
            await conn.execute(
                """
                INSERT INTO candidatures (
                    id, reference, nom, prenom, email, telephone,
                    "offreId", "cvUrl", "cvTexte", "competencesDetectees",
                    "dateSoumission", "consentementRGPD", "consentementIA"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), true, true)
                """,
                candidature_id, reference, nom, prenom, email, telephone,
                offre_id,
                f"/uploads/cv/{cv_file.filename}",
                cv_data.get('texte_brut', ''),
                cv_data.get('competences', []),
            )
        finally:
            await conn.close()

        if background_tasks:
            cv = CVExtrait(
                candidat_nom=f"{prenom} {nom}",
                candidat_email=email,
                competences=cv_data.get('competences', []),
                soft_skills=cv_data.get('soft_skills', []),
                experience_annees=cv_data.get('experience_annees', 0.0),
                diplomes=cv_data.get('diplomes', []),
                texte_brut=cv_data.get('texte_brut', ''),
            )
            offre = await _fetch_offre(offre_id)
            config = await get_config()
            resultat = cv_scorer.scorer(cv, offre, config)
            background_tasks.add_task(_persist_scoring, candidature_id, resultat, cv.texte_brut)

        return {
            "success": True,
            "candidature_id": candidature_id,
            "cv_length": len(cv_data.get('texte_brut', '')),
            "competences_count": len(cv_data.get('competences', [])),
        }

    except Exception as e:
        log.error(f"Erreur import candidature: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)