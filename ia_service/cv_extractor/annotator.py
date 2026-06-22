# ia_service/cv_extractor/annotator.py
# Annotateur heuristique de lignes CV
# Utilisé pour l'entraînement du modèle ML et comme fallback si le modèle est absent

import re
from typing import Optional

# ── Classes de blocs ──────────────────────────────────────────────────────────
BLOCK_TYPES = {
    'SECTION_HEADER': 0,
    'JOB_TITLE':      1,
    'COMPANY':        2,
    'BULLET_POINT':   3,
    'DIPLOMA':        4,
    'CONTACT':        5,
    'OTHER':          6,
}
BLOCK_NAMES  = {v: k for k, v in BLOCK_TYPES.items()}
N_CLASSES    = len(BLOCK_TYPES)
CLASS_LABELS = [BLOCK_NAMES[i] for i in range(N_CLASSES)]

# ── Regex ─────────────────────────────────────────────────────────────────────
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_DATE_RANGE_RE = re.compile(
    r'((?:19|20)\d{2})\s*[-\u2013\u2014/]\s*'
    r"((?:19|20)\d{2}|pr[eé]sent|actuel|current|now|ongoing)",
    re.IGNORECASE
)

# ── Ancres de sections connues ────────────────────────────────────────────────
SECTION_ANCHORS_FLAT = {
    'experience', 'experiences', 'education', 'formation', 'formations',
    'competences', 'skills', 'langues', 'languages', 'certifications',
    'profil', 'summary', 'profile', 'projets', 'projects', 'stage', 'stages',
    'diplomes', 'degrees', 'contact', 'about', 'associations', 'parcours',
    'work experience', 'professional experience', 'technical skills',
}

# ── Patterns diplômes ─────────────────────────────────────────────────────────
DIPLOMA_PATTERNS = [
    r"Ing[eé]nieur\s+(?:en\s+)?[\w\s\-']{2,50}",
    r"Licence\s+(?:en|de|Professionnelle)[\w\s\-']{0,40}",
    r"Master\s+(?:en|de|of|Professionnel)[\w\s\-']{0,40}",
    r"Bachelor\s+(?:of|in)\s+[\w\s\-']{2,40}",
    r"(?:MSc|MBA|PhD|BSc)\s+[\w\s\(\)\-']{2,40}",
    r"Doctorat\s+en\s+[\w\s\-']{2,40}",
]

# ── Patterns entreprises ──────────────────────────────────────────────────────
COMPANY_PATTERNS = [
    r'\b(?:s\.?a\.?r\.?l\.?|s\.?a\.?s\.?|s\.?a\.?)\b',
    r'\b(?:group(?:e)?|holding|corp|inc\.?|ltd\.?)\b',
    r'\b(?:telecom|technologies?|solutions?|consulting|services?)\b',
]

# ── Guard localisation pour le fallback JOB_TITLE ────────────────────────────
# Fix mineur : évite de classer "Tunis Tunisie" ou "Paris France" comme JOB_TITLE.
# Liste non exhaustive — couvre les villes les plus fréquentes dans les CVs
# du bassin de recrutement cible (Tunisie, France, Maroc, Belgique).
_LOCATION_RE = re.compile(
    r'\b(?:'
    r'Tunis|Sfax|Sousse|Monastir|Nabeul|Bizerte|Ariana|Manouba|'
    r'Paris|Lyon|Marseille|Toulouse|Bordeaux|Nantes|Lille|Strasbourg|'
    r'Casablanca|Rabat|Marrakech|Alger|Oran|'
    r'Bruxelles|Geneve|Lausanne|'
    r'Tunisie|France|Maroc|Algerie|Belgique|Suisse|Canada'
    r')\b',
    re.IGNORECASE
)


def annotate_line(line: str, prev: str = "", nxt: str = "") -> int:
    """
    Annote une ligne de CV avec un type de bloc.
    Retourne l'identifiant numérique du type (voir BLOCK_TYPES).

    Utilisé comme :
    - Labels d'entraînement pour le modèle ML (notebook)
    - Fallback en production si le modèle .pkl est absent
    """
    lc = line.strip()
    ll = lc.lower()

    if not lc or len(lc) < 2:
        return BLOCK_TYPES['OTHER']

    # Markdown headers → section
    if re.match(r'^#{1,3}\s+', lc):
        return BLOCK_TYPES['SECTION_HEADER']

    # Bullet markdown → bullet
    if re.match(r'^[-*]\s+\w', lc):
        return BLOCK_TYPES['BULLET_POINT']

    # Email → contact
    if _EMAIL_RE.search(lc):
        return BLOCK_TYPES['CONTACT']

    # Téléphone → contact
    if re.match(r'^\+?\d[\d\s.\-()]{8,}$', lc):
        return BLOCK_TYPES['CONTACT']

    # Séparateur → other
    if re.match(r'^[-_=*\.]{3,}$', lc):
        return BLOCK_TYPES['OTHER']

    # Ancres de section connues
    ll_clean = ll.strip(':').strip()
    if ll_clean in SECTION_ANCHORS_FLAT or any(
        ll_clean.startswith(a) for a in SECTION_ANCHORS_FLAT if len(a) > 5
    ):
        return BLOCK_TYPES['SECTION_HEADER']

    # Patterns diplômes
    for pat in DIPLOMA_PATTERNS:
        if re.search(pat, lc, re.I):
            return BLOCK_TYPES['DIPLOMA']

    # Bullets unicode
    if lc[:1] in '\u2022\u25aa\u25b8\xb7' or re.match(r'^\d+[.)]\s+\w', lc):
        return BLOCK_TYPES['BULLET_POINT']

    # Patterns entreprises
    if any(re.search(p, ll, re.I) for p in COMPANY_PATTERNS) and len(lc) < 70:
        return BLOCK_TYPES['COMPANY']

    # Titres de poste heuristique (2-5 mots, pas de chiffres, commence par majuscule)
    # Fix mineur : on exclut les lignes qui ressemblent à des localisations
    # (ex: "Tunis Tunisie", "Paris France") pour éviter les faux positifs JOB_TITLE.
    words = lc.split()
    if (
        2 <= len(words) <= 5
        and not re.search(r'[\d@|]', lc)
        and lc[0].isupper()
        and not _LOCATION_RE.search(lc)
    ):
        return BLOCK_TYPES['JOB_TITLE']

    return BLOCK_TYPES['OTHER']