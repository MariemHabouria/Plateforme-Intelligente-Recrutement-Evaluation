# ia_service/cv_extractor/parser.py
# Pipeline complet d'extraction CV : PDF -> texte -> entites structurees
# Adapte depuis le notebook cv_model_comparison.ipynb — Couche 1

import os
import re
import logging
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass, field

import numpy as np

log = logging.getLogger("ia_service.parser")

# ── Import conditionnel des libs lourdes ──────────────────────────────────────
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    log.warning("pdfplumber non disponible")

try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False
    log.warning("PyMuPDF non disponible")

try:
    import spacy
    _nlp_fr = spacy.load("fr_core_news_md")
    _nlp_en = spacy.load("en_core_web_md")
    _nlp_fr.select_pipes(enable=["ner"])
    _nlp_en.select_pipes(enable=["ner"])
    HAS_SPACY = True
except Exception:
    HAS_SPACY = False
    log.warning("spaCy non disponible — extraction nom/localisation desactivee")

# ── Import du classifieur ML ──────────────────────────────────────────────────
try:
    from .predictor import classify_cv_lines, is_ml_available
    HAS_CLASSIFIER = True
except ImportError as e:
    HAS_CLASSIFIER = False
    log.warning(f"Classifieur ML non disponible ({e}) — fallback heuristique")

# ── Regex ─────────────────────────────────────────────────────────────────────
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_DATE_RANGE_RE = re.compile(
    r'((?:19|20)\d{2})\s*[-\u2013\u2014/]\s*'
    r"((?:19|20)\d{2}|pr[eé]sent|actuel|current|now|ongoing)",
    re.IGNORECASE
)

# ── Keywords et ancres de sections ────────────────────────────────────────────
# Mots-clés indiquant un stage/alternance — reproduit depuis _is_stage() du notebook
_STAGE_KEYWORDS = [
    'stage', 'stagiaire', 'alternant', 'alternance', 'apprenti', 'apprentissage',
    'pfe', 'projet de fin', "fin d'etudes", "fin d'études",
    'intern', 'internship', 'trainee', 'traineeship',
    'work placement', 'industrial training', 'summer intern',
    'graduation project', 'end of studies',
]

# Ancres de sections stage (toutes les dates sous ces sections sont ignorées)
_STAGE_SECTION_ANCHORS = {
    'stages', 'stage', 'internships', 'internship',
    'alternances', 'projets de fin', 'pfe', 'pfm',
}
_FORMATION_SECTION_ANCHORS = {
    'formation', 'formations', 'education', 'diplomes', 'degrees',
    'cursus academique', 'academic background', 'qualifications',
}

# Ancres de sections expérience professionnelle
_EXP_SECTION_ANCHORS = {
    'experience professionnelle', 'experiences professionnelles',
    'experiences', 'parcours professionnel', 'historique des postes',
    'activites professionnelles', 'work experience',
    'professional experience', 'employment history',
}

SECTION_ANCHORS = {
    'experience': {
        'fr': ['experiences professionnelles', 'experience professionnelle', 'experiences', 'parcours professionnel'],
        'en': ['work experience', 'professional experience', 'employment history'],
    },
    'education': {
        'fr': ['formation', 'formations', 'diplomes', 'education', 'cursus academique'],
        'en': ['education', 'academic background', 'qualifications', 'degrees'],
    },
    'skills': {
        'fr': ['competences', 'competences techniques', 'outils et technologies', 'stack technique'],
        'en': ['skills', 'technical skills', 'core competencies', 'technologies'],
    },
    'languages': {
        'fr': ['langues', 'langues parlees', 'competences linguistiques'],
        'en': ['languages', 'language skills'],
    },
    'certifications': {
        'fr': ['certifications', 'certificats'],
        'en': ['certifications', 'certificates'],
    },
    'stage': {
        'fr': ['stages', 'stage', 'alternances'],
        'en': ['internships', 'internship'],
    },
}

DIPLOMA_PATTERNS = [
    r"Ing[eé]nieur\s+(?:en\s+)?[\w\s\-']{2,50}",
    r"Licence\s+(?:en|de|Professionnelle|Fondamentale)[\w\s\-']{0,40}",
    r"Master\s+(?:en|de|of|Professionnel|Recherche)[\w\s\-']{0,40}",
    r"Bachelor\s+(?:of|in)\s+[\w\s\-']{2,40}",
    r"(?:MSc|MBA|PhD|BSc|MPA)\s+[\w\s\(\)\-']{2,40}",
    r"Doctorat\s+en\s+[\w\s\-']{2,40}",
    r"Baccalaur[eé]at\s+(?:en|de|in)?\s*[\w\s\-']{0,40}",
    r"(?:BTS|DUT|HND)\s+[\w\s\-']{2,40}",
]

TECH_PATTERNS = [
    r'\b(java(?:script)?|typescript|python|c\+\+|c#|php|ruby|go(?:lang)?|rust|swift|kotlin)\b',
    r'\b(react(?:\.js)?|angular(?:js)?|vue(?:\.js)?|next(?:\.js)?|html5?|css3?)\b',
    r'\b(django|flask|fastapi|express|laravel|spring(?:boot)?)\b',
    r'\b(mysql|postgresql|sqlite|oracle|mongodb|redis|elasticsearch)\b',
    r'\b(docker|kubernetes|terraform|ansible|jenkins|gitlab)\b',
    r'\b(aws|azure|gcp|s3|ec2|lambda|heroku)\b',
    r'\b(tensorflow|pytorch|keras|scikit[\ \-]learn|pandas|numpy|matplotlib)\b',
    r'\b(git|github|gitlab|jira|agile|scrum|devops|ci[\ /]cd)\b',
    r'\b(linux|ubuntu|debian|centos|windows\s+server)\b',
    r'\b(node(?:\.js)?|webpack|vite|graphql|rest(?:ful)?|soap)\b',
    r'\b(sql|plsql|tsql|nosql)\b',
    r'\b(sap(?:\s+hana)?|crm|erp|odoo|salesforce)\b',
]

LANG_MAP = {
    r'fran[cç]ais?|french':        'Francais',
    r'anglais?|english':            'Anglais',
    r'arabe|arabic':                'Arabe',
    r'espagnol|spanish':            'Espagnol',
    r'allemand|german':             'Allemand',
    r'italien|italian':             'Italien',
    r'chinois|chinese|mandarin':    'Chinois',
    r'portugais|portuguese':        'Portugais',
    r'russe|russian':               'Russe',
}

LEVEL_MAP = [
    (r'natif|native|langue\s+maternelle|c2\b', 'Natif'),
    (r'courant|fluent|bilingue|bilingual|c1\b', 'Courant'),
    (r'avance|advanced|proficient',             'Avance'),
    (r'intermediaire|intermediate|b[12]\b',     'Intermediaire'),
    (r'debutant|beginner|a[12]\b|notions?',     'Debutant'),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize(s: str) -> str:
    t = unicodedata.normalize('NFD', s.lower())
    return re.sub(r'[\u0300-\u036f]', '', t).strip()


def fix_encoding(text: str) -> str:
    if not text:
        return text
    ACCENT_MAP = [
        (r'´e', 'é'), (r'`e', 'è'), (r'\^e', 'ê'),
        (r'´a', 'á'), (r'`a', 'à'), (r'\^a', 'â'),
        (r'c,', 'ç'), (r'C,', 'Ç'),
        (r'\ufb00', 'ff'), (r'\ufb01', 'fi'), (r'\ufb02', 'fl'),
    ]
    for pat, rep in ACCENT_MAP:
        text = re.sub(pat, rep, text)
    return unicodedata.normalize('NFC', text)


def detect_language(text: str) -> str:
    tl = text.lower()[:3000]
    fr = sum(1 for w in ['experience', 'formation', 'competences', 'travail', 'stage',
                          'diplome', 'entreprise', 'langues'] if w in tl)
    en = sum(1 for w in ['experience', 'education', 'skills', 'work', 'internship',
                          'degree', 'company', 'languages'] if w in tl)
    if re.search(r'[éèêëàâçîïôùû]', tl):
        fr += 3
    return 'fr' if fr >= en else 'en'


# ── Logique stage vs expérience pro (reproduit depuis le notebook) ────────────

def parse_date_range(raw: str) -> dict:
    """
    Parse une plage de dates texte et retourne un dict avec start_year,
    end_year, is_current, duration_months.
    Reproduit depuis le notebook cv_model_comparison.ipynb.
    """
    if not raw:
        return {}
    m = _DATE_RANGE_RE.search(raw)
    if not m:
        return {}

    result = {}
    try:
        result['start_year'] = int(m.group(1))
    except (ValueError, TypeError):
        result['start_year'] = 0

    end_raw = m.group(2).lower() if m.group(2) else ''
    is_current = bool(re.match(
        r"pr[eé]sent|actuel|aujourd|current|now|ce\s+jour|ongoing", end_raw
    ))
    result['is_current'] = is_current

    if is_current:
        result['end_year'] = datetime.now().year
        result['end_month'] = datetime.now().month
    elif re.match(r'\d{4}', end_raw):
        result['end_year'] = int(end_raw[:4])

    sy = result.get('start_year', 0)
    ey = result.get('end_year', 0)
    sm = result.get('start_month', 1)
    em = result.get('end_month', 12)

    if sy and ey and sy <= ey <= datetime.now().year + 1:
        duration = (ey - sy) * 12 + (em - sm)
        result['duration_months'] = max(0, duration)

    return result


def _is_stage(title: str, description_lines: List[str] = None, period: str = '') -> bool:
    """
    Détermine si une expérience est un stage/alternance/PFE.
    Reproduit fidèlement depuis la fonction _is_stage() du notebook.

    Trois critères :
    1. Présence d'un keyword stage dans le texte combiné
    2. Le titre commence par Stagiaire / Intern / Trainee
    3. La durée calculée est inférieure à 6 mois
    """
    combined = (
        (title or '') + ' ' +
        ' '.join(description_lines or []) + ' ' +
        (period or '')
    ).lower()

    # Critère 1 : keyword stage dans le texte
    for kw in _STAGE_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', combined):
            return True

    # Critère 2 : titre qui commence explicitement par Stagiaire / Intern / Trainee
    if title and re.match(r'^(Stagiaire|Intern|Trainee)\s', title, re.I):
        return True

    # Critère 3 : durée < 6 mois → probablement un stage
    if period:
        pd_info = parse_date_range(period)
        dur = pd_info.get('duration_months')
        if dur is not None and 0 < dur < 6:
            return True

    return False


def _get_active_section(line_normalized: str, current_section: str) -> str:
    cleaned = line_normalized.strip(':').strip()

    if cleaned in _STAGE_SECTION_ANCHORS or any(
        cleaned.startswith(a) for a in _STAGE_SECTION_ANCHORS if len(a) > 4
    ):
        return 'stage'

    if cleaned in _EXP_SECTION_ANCHORS or any(
        cleaned.startswith(a) for a in _EXP_SECTION_ANCHORS if len(a) > 6
    ):
        return 'experience'

    # ← NOUVEAU : section formation → ignore les dates qu'elle contient
    if cleaned in _FORMATION_SECTION_ANCHORS or any(
        cleaned.startswith(a) for a in _FORMATION_SECTION_ANCHORS if len(a) > 5
    ):
        return 'formation'

    return current_section


# ── Extraction PDF ────────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path: str) -> Tuple[str, List[str]]:
    """Extrait le texte d'un PDF via PyMuPDF + pdfplumber avec fallback."""
    warnings_list = []

    if not os.path.exists(pdf_path):
        return "", [f"Fichier introuvable: {pdf_path}"]

    text_fitz = ""
    if HAS_FITZ:
        try:
            doc = fitz.open(pdf_path)
            pages = [p.get_text("text", sort=True) for p in doc if p.get_text("text").strip()]
            text_fitz = "\n".join(pages)
            doc.close()
            text_fitz = fix_encoding(text_fitz)
        except Exception as e:
            warnings_list.append(f"PyMuPDF erreur: {e}")

    text_plumber = ""
    if HAS_PDFPLUMBER:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                pages = [p.extract_text(x_tolerance=2, y_tolerance=3) for p in pdf.pages]
                text_plumber = "\n".join(filter(None, pages))
        except Exception as e:
            warnings_list.append(f"pdfplumber erreur: {e}")

    if not text_fitz.strip() and not text_plumber.strip():
        warnings_list.append("Aucun texte extrait du PDF")
        return "", warnings_list

    text = text_fitz if len(text_fitz) >= len(text_plumber) else text_plumber
    return text, warnings_list


# ── Extraction des champs ─────────────────────────────────────────────────────

def extract_contact(text: str) -> dict:
    result = {}

    m = _EMAIL_RE.search(text)
    result['email'] = m.group(0).lower() if m else None

    phone_patterns = [
        r'\+216\s*[2-9]\d[\s.]?\d{3}[\s.]?\d{3}',
        r'(?<![0-9])[2-9]\d[\s.]?\d{3}[\s.]?\d{3}(?![0-9])',
        r'\+33\s*(?:\(0\))?\d[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2,6}',
        r'\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{3,5}[\s.\-]?\d{3,6}',
    ]
    result['telephone'] = None
    for p in phone_patterns:
        pm = re.search(p, text)
        if pm:
            result['telephone'] = re.sub(r'\s+', ' ', pm.group(0)).strip()
            break

    lm = re.search(r'linkedin\.com/in/[\w\-\.%+]+', text, re.I)
    result['linkedin'] = lm.group(0).rstrip('.,;') if lm else None

    gm = re.search(r'github\.com/[\w\-\.]+', text, re.I)
    result['github'] = gm.group(0).rstrip('.,;') if gm else None

    return result


def extract_name(text: str, lang: str) -> Optional[str]:
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    if HAS_SPACY:
        nlp = _nlp_fr if lang == 'fr' else _nlp_en
        header = '\n'.join(lines[:15])
        doc = nlp(header[:1000])
        for ent in doc.ents:
            if ent.label_ == 'PERSON' and len(ent.text.split()) >= 2:
                return ent.text.title()

    blacklist = {'linkedin', 'github', 'email', 'phone', 'formation', 'education',
                 'experience', 'competences', 'skills', 'cv', 'profil', 'curriculum'}
    for line in lines[:10]:
        if any(bw in line.lower() for bw in blacklist):
            continue
        if re.search(r'[@\d/\\|+:;]', line):
            continue
        words = line.split()
        if 2 <= len(words) <= 4:
            caps = sum(1 for w in words if len(w) > 1 and w[0].isupper())
            if caps >= 2:
                return line.title()
    return None


def extract_localisation(text: str, lang: str) -> Optional[str]:
    if HAS_SPACY:
        nlp = _nlp_fr if lang == 'fr' else _nlp_en
        doc = nlp(text[:1500])
        locs = [e.text for e in doc.ents if e.label_ in ['GPE', 'LOC']]
        if locs:
            from collections import Counter
            return Counter(locs).most_common(1)[0][0]

    m = re.search(
        r'\b([A-Z][a-z]+(?:[- ][A-Z][a-z]+)*),\s*'
        r'(?:Tunisie|France|Maroc|Algerie|Belgique|Suisse|Canada|USA|Allemagne|UK)\b',
        text
    )
    return m.group(1).strip() if m else None


def extract_skills(text: str) -> Tuple[List[str], List[str]]:
    """Retourne (hard_skills, soft_skills)."""
    text_lower = text.lower()
    hard = set()

    for pattern in TECH_PATTERNS:
        for m in re.findall(pattern, text_lower):
            skill = m.strip().rstrip('.')
            if len(skill) >= 2:
                hard.add(skill)

    SOFT_PATTERNS = [
        (r'teamwork|travail.*[eé]quipe|esprit.*[eé]quipe', 'teamwork'),
        (r'communication|communicatif',                    'communication'),
        (r'leadership|leader',                              'leadership'),
        (r'autonomie|autonome|self.?motivated',             'autonomy'),
        (r'rigueur|rigoureux|attention.?to.?detail',        'attention_to_detail'),
        (r'adaptabilit|adaptable|flexibility',              'adaptability'),
        (r'cr[eé]ativit|cr[eé]atif|creative',              'creativity'),
        (r'organisation|organis',                           'organization'),
        (r'proactivit|proactif|proactive|initiative',       'proactivity'),
        (r'problem.?solving|r[eé]solution.*probl',          'problem_solving'),
    ]
    soft = set()
    for pattern, token in SOFT_PATTERNS:
        if re.search(pattern, text_lower):
            soft.add(token)

    return sorted(hard)[:50], sorted(soft)[:20]


def extract_diplomas(text: str) -> List[dict]:
    diplomas = []
    seen = set()
    lines = text.split('\n')

    for i, line in enumerate(lines):
        ls = re.sub(r'^#{1,3}\s+', '', line.strip())
        if not ls or len(ls) < 8 or len(ls) > 220:
            continue

        for pattern in DIPLOMA_PATTERNS:
            m = re.search(pattern, ls, re.I)
            if not m:
                continue
            diploma_text = re.sub(r'\s+', ' ', m.group(0)).strip()
            if len(diploma_text) < 8:
                continue
            key = diploma_text.lower()[:50]
            if key in seen:
                continue
            seen.add(key)

            institution = None
            for j in range(i + 1, min(i + 5, len(lines))):
                nxt = lines[j].strip()
                if not nxt or len(nxt) < 4:
                    continue
                if _DATE_RANGE_RE.search(nxt) and len(nxt) < 25:
                    continue
                if any(re.search(p, nxt, re.I) for p in DIPLOMA_PATTERNS):
                    continue
                institution = nxt[:100]
                break

            context = ' '.join(lines[max(0, i - 1): min(len(lines), i + 4)])
            yr = re.search(r'\b((?:19|20)\d{2})\b', context)

            diplomas.append({
                'diplome':     diploma_text,
                'institution': institution,
                'annee':       yr.group(1) if yr else None,
                'confidence':  0.88,
            })
            break

    return diplomas[:8]


def extract_experience_years(text: str) -> float:
    """
    Calcule les années d'expérience professionnelle réelle.

    Logique reproduite depuis le notebook cv_model_comparison.ipynb :
      - Niveau 1 : mention explicite "X ans d'expérience" hors contexte stage
      - Niveau 2 : suivi de section ligne par ligne via _get_active_section()
                   → les dates sous une section 'stage/alternance/PFE' sont ignorées
      - Niveau 3 : _is_stage() filtre les blocs mal classés dans une section 'experience'
                   (cas reclassified_stage du notebook)
      - Niveau 4 : durée < 6 mois dans parse_date_range() → ignorée (stage court)
    """
    # ── Niveau 1 : mention explicite ─────────────────────────────────────────
    explicit_patterns = [
    r'(\d+)\s*\+?\s*(?:years?)\s+(?:of\s+)?experience',
    r"(\d+)\s*\+?\s*ans?\s+d['\u2019]?exp[eé]rience",
]
    for p in explicit_patterns:
        m = re.search(p, text, re.I)
        if m:
            val = float(m.group(1))
            if 0 < val <= 40:
                # Vérifier que la mention n'est pas dans un contexte stage
                ctx_start = max(0, m.start() - 120)
                ctx = text[ctx_start: m.start() + 60].lower()
                if not any(kw in ctx for kw in _STAGE_KEYWORDS):
                    return val

    # ── Niveaux 2/3/4 : parcours ligne par ligne ──────────────────────────────
    lines = text.split('\n')
    total = len(lines)
    current_section = 'other'
    total_months = 0

    for i, line in enumerate(lines):
        ls = line.strip()
        if not ls:
            continue

        ll = _normalize(ls)

        # Détection changement de section
        new_section = _get_active_section(ll, current_section)
        if new_section != current_section:
            log.debug(f"[extract_experience_years] Section → '{new_section}' à la ligne {i}: {ls[:50]}")
            current_section = new_section
            continue

        # Chercher une plage de dates dans cette ligne
        dm = _DATE_RANGE_RE.search(ls)
        if not dm:
            continue

        # Niveau 2 : section stage ou formation explicite → ignorer
        if current_section in ('stage', 'formation'):
            log.debug(f"[extract_experience_years] Ignoré (section {current_section}) : {ls[:60]}")
            continue

        # Niveau 3 : _is_stage() sur le contexte du bloc (3 lignes avant + ligne courante)
        context_lines = [lines[j].strip() for j in range(max(0, i - 3), i + 1)]
        context_text = ' '.join(context_lines)
        if _is_stage(title=context_text, period=dm.group(0)):
            log.debug(f"[extract_experience_years] Ignoré (_is_stage) : {ls[:60]}")
            continue

        # Calculer la durée via parse_date_range (inclut le niveau 4 durée < 6 mois)
        pd_info = parse_date_range(dm.group(0))
        dur = pd_info.get('duration_months')

        if dur is None:
            # Fallback calcul simple si parse_date_range ne retourne pas duration_months
            try:
                start = int(dm.group(1))
                end_raw = dm.group(2)
                end = int(end_raw) if end_raw.isdigit() else datetime.now().year
                if 1980 <= start <= datetime.now().year and start <= end:
                    dur = (end - start) * 12
            except (ValueError, TypeError):
                continue

        if dur is None or dur <= 0:
            continue

        # Niveau 4 : durée < 6 mois → probablement un stage court, on ignore
        if dur < 6:
            log.debug(f"[extract_experience_years] Ignoré (durée {dur} mois < 6) : {ls[:60]}")
            continue

        total_months += dur
        log.debug(f"[extract_experience_years] Comptabilisé {dur} mois : {ls[:60]}")

    if total_months > 0:
        return min(round(total_months / 12, 1), 40.0)

    return 0.0


def extract_languages(text: str) -> List[dict]:
    result = []
    seen = []
    tl = text.lower()

    for pattern, label in LANG_MAP.items():
        if not re.search(r'\b(?:' + pattern + r')\b', tl):
            continue
        if label in seen:
            continue
        seen.append(label)
        m = re.search(r'\b(?:' + pattern + r')\b', tl)
        context = tl[max(0, m.start() - 5): m.start() + 100]
        level = next((ll for lp, ll in LEVEL_MAP if re.search(lp, context)), None)
        result.append({'langue': label, 'niveau': level})

    return result


# ── Pipeline principal ────────────────────────────────────────────────────────

def parse_cv(pdf_path: str) -> dict:
    """
    Pipeline complet : PDF -> dict structure pret pour le scoring.
    Retourne un dict avec tous les champs extraits du CV.

    Le champ 'experience_annees' ne compte que les expériences professionnelles
    réelles — les stages, alternances et PFE sont exclus via _is_stage() et
    le suivi de section (_get_active_section), conformément à la logique du notebook.
    """
    text, warnings_list = extract_text_from_pdf(pdf_path)

    if not text or len(text) < 50:
        return {
            'nom': None, 'email': None, 'telephone': None, 'localisation': None,
            'linkedin': None, 'github': None, 'competences': [], 'soft_skills': [],
            'experience_annees': 0.0, 'diplomes': [], 'langues': [],
            'certifications': [], 'texte_brut': text or '', 'warnings': warnings_list,
            'classified_lines': [], 'ml_available': False,
        }

    lang = detect_language(text)
    contact = extract_contact(text)
    hard_skills, soft_skills = extract_skills(text)

    # ── Classification ML des lignes du CV ───────────────────────────────────
    classified_lines = []
    ml_available = False

    if HAS_CLASSIFIER:
        try:
            ml_available = is_ml_available()
            classified_lines = classify_cv_lines(text)

            mode = "LightGBM" if ml_available else "heuristique"
            type_counts: dict = {}
            for line in classified_lines:
                t = line.get('type', 'OTHER')
                type_counts[t] = type_counts.get(t, 0) + 1
            log.info(f"Classification CV ({mode}): {len(classified_lines)} lignes | {type_counts}")

        except Exception as e:
            log.error(f"Erreur classification ML: {e}")
            classified_lines = []

    return {
        'nom':               extract_name(text, lang),
        'email':             contact.get('email'),
        'telephone':         contact.get('telephone'),
        'localisation':      extract_localisation(text, lang),
        'linkedin':          contact.get('linkedin'),
        'github':            contact.get('github'),
        'langue_cv':         lang.upper(),
        'competences':       hard_skills,
        'soft_skills':       soft_skills,
        'experience_annees': extract_experience_years(text),
        'diplomes':          extract_diplomas(text),
        'langues':           extract_languages(text),
        'certifications':    [],
        'texte_brut':        text[:8000],
        'warnings':          warnings_list,
        'classified_lines':  classified_lines,
        'ml_available':      ml_available,
    }