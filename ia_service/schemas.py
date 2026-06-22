# ia_service/schemas.py
# Schémas Pydantic partagés entre tous les modules

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Entrées API
# ---------------------------------------------------------------------------

class ScoringRequest(BaseModel):
    cv_path: str = Field(..., description="Chemin absolu vers le PDF du CV")
    offre_id: str = Field(..., description="UUID de l'offre dans PostgreSQL")
    candidature_id: str = Field(..., description="UUID de la candidature")

class MatchingInverseRequest(BaseModel):
    offre_id: str
    top_n: int = Field(default=10, ge=1, le=100)

class ParseCVRequest(BaseModel):
    cv_path: str


# ---------------------------------------------------------------------------
# Structures de données internes (dataclasses légères)
# ---------------------------------------------------------------------------

@dataclass
class OffreInput:
    id: str
    reference: str
    intitule: str
    competences: List[str]
    niveau_poste: str = "CADRE_CONFIRME"
    type_contrat: str = "CDI"
    description: str = ""
    profil_recherche: str = ""
    competences_souhaitees: List[str] = field(default_factory=list)
    experience_min_annees: float = 0.0
    formation_requise: str = ""


@dataclass
class CVExtrait:
    candidat_nom: str = ""
    candidat_email: str = ""
    competences: List[str] = field(default_factory=list)
    experience_annees: float = 0.0
    diplomes: List[dict] = field(default_factory=list)
    postes_occupes: List[dict] = field(default_factory=list)
    langues: List[str] = field(default_factory=list)
    texte_brut: str = ""
    certifications: List[str] = field(default_factory=list)
    soft_skills: List[str] = field(default_factory=list)
    ats_keywords: dict = field(default_factory=dict)


@dataclass
class ScoreDetail:
    critere: str
    score: float
    poids: float
    contribution: float
    positif: bool
    details: str


@dataclass
class ResultatScoring:
    score_global: int
    score_experience: int
    competences_detectees: List[str] = field(default_factory=list)
    competences_manquantes: List[str] = field(default_factory=list)
    score_competences_pct: float = 0.0
    score_formation_pct: float = 0.0
    score_semantique_pct: float = 0.0
    score_completude_pct: float = 0.0
    competences_bonus: List[str] = field(default_factory=list)
    shap_details: List[ScoreDetail] = field(default_factory=list)
    recommandation: str = ""
    eligible_matching_inverse: bool = False
    version_modele: str = "M3-Hybride-v1.1"
    domain_mismatch: bool = False


# ---------------------------------------------------------------------------
# Réponses API
# ---------------------------------------------------------------------------

class ScoringResponse(BaseModel):
    success: bool
    candidature_id: str
    score_global: int
    score_experience: int
    recommandation: str
    competences_detectees: List[str]
    competences_manquantes: List[str]
    score_competences_pct: float
    score_formation_pct: float
    score_semantique_pct: float
    score_completude_pct: float
    shap_details: List[Dict[str, Any]]
    eligible_matching_inverse: bool
    version_modele: str
    cv_parsed: Dict[str, Any]
    domain_mismatch: bool = False


class ParseCVResponse(BaseModel):
    success: bool
    nom: Optional[str]
    email: Optional[str]
    telephone: Optional[str]
    localisation: Optional[str]
    competences: List[str]
    soft_skills: List[str]
    experience_annees: float
    diplomes: List[dict]
    langues: List[dict]
    # Fix important : List[str] au lieu de List[dict]
    # parser.py retourne toujours [] (liste vide de strings),
    # et CVExtrait.certifications est déjà List[str]
    certifications: List[str] = Field(default_factory=list)


class MatchingInverseResponse(BaseModel):
    success: bool
    offre_id: str
    n_candidats_total: int
    n_shortlist: int
    shortlist: List[Dict[str, Any]]