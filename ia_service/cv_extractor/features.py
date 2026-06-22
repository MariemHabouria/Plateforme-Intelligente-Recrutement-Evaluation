# ia_service/cv_extractor/features.py
# Extraction des 58 features structurelles par ligne de CV
# Reproduit fidelement depuis le notebook cv_model_comparison.ipynb

import re
import numpy as np
from typing import List

_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)
_DATE_RANGE_RE = re.compile(
    r'((?:19|20)\d{2})\s*[-\u2013\u2014/]\s*'
    r"((?:19|20)\d{2}|pr[eé]sent|actuel|current|now|ongoing)",
    re.IGNORECASE
)


def extract_structural_features(
    line: str,
    prev_line: str = "",
    next_line: str = "",
    position: int = 0,
    total_lines: int = 1,
) -> dict:
    """
    Extrait 58 features structurelles d'une ligne de CV.
    Ces features alimentent le modele ML LightGBM de classification de blocs.

    Le nombre de features (58) doit rester synchronise avec :
      - models/structure_model_metadata.json → n_features
      - predictor.py → FEATURE_NAMES (via cet import)
    Ne pas ajouter ou supprimer de features sans reentrained le modele.
    """
    lc    = line.strip()
    words = lc.split()
    alpha = [c for c in lc if c.isalpha()]
    upper_ratio  = sum(1 for c in alpha if c.isupper()) / max(len(alpha), 1)
    digit_ratio  = sum(1 for c in lc if c.isdigit()) / max(len(lc), 1)
    special      = sum(1 for c in lc if c in '@.:;/\\|+()[]{}#%&')
    char_variety = len(set(lc.lower())) / max(len(lc), 1)

    return {
        'length':           min(len(lc), 300),
        'word_count':       len(words),
        'avg_word_len':     round(np.mean([len(w) for w in words]) if words else 0, 2),
        'position_ratio':   round(position / max(total_lines, 1), 3),
        'is_first_5':       int(position < 5),
        'is_first_15':      int(position < 15),
        'is_top_20pct':     int(position < total_lines * 0.20),
        'is_bottom_20pct':  int(position > total_lines * 0.80),
        'is_all_upper':     int(bool(lc) and lc.isupper()),
        'is_title_case':    int(bool(lc) and lc.istitle()),
        'is_all_lower':     int(bool(lc) and lc.islower()),
        'upper_ratio':      round(upper_ratio, 2),
        'starts_upper':     int(bool(lc) and lc[0].isupper()),
        'is_short':         int(len(lc) < 20),
        'is_medium':        int(20 <= len(lc) < 60),
        'is_long':          int(len(lc) >= 60),
        'is_very_long':     int(len(lc) >= 120),
        'has_colon':        int(':' in lc),
        'has_pipe':         int('|' in lc),
        'has_slash':        int('/' in lc),
        'has_dash':         int('-' in lc or '\u2013' in lc),
        'has_comma':        int(',' in lc),
        'has_dot':          int('.' in lc),
        'has_parentheses':  int('(' in lc and ')' in lc),
        'has_at_sign':      int('@' in lc),
        'has_plus':         int('+' in lc),
        'special_char_count': min(special, 10),
        'is_bullet_start':  int(lc[:1] in '\u2022-*\u25aa\u25b8\xb7\u2013'
                                 or bool(re.match(r'^\d+[.)]\s', lc))),
        'bullet_char':      int(lc[:1] in '\u2022\u25aa\u25b8\xb7'),
        'has_digit':        int(any(c.isdigit() for c in lc)),
        'digit_ratio':      round(digit_ratio, 2),
        'has_4digit_seq':   int(bool(re.search(r'\d{4}', lc))),
        'has_date_sep':     int(bool(_DATE_RANGE_RE.search(lc))),
        'pure_number':      int(bool(re.match(r'^\d+$', lc))),
        'is_separator':     int(bool(re.match(r'^[-_=*\\.]{3,}$', lc))),
        'is_empty_ish':     int(len(lc) <= 2),
        'prev_empty':       int(len(prev_line.strip()) == 0),
        'prev_length':      min(len(prev_line.strip()), 200),
        'prev_is_upper':    int(bool(prev_line.strip()) and prev_line.strip().isupper()),
        'next_empty':       int(len(next_line.strip()) == 0),
        'next_length':      min(len(next_line.strip()), 200),
        'next_is_bullet':   int(next_line.strip()[:1] in '\u2022-*\u25aa\u25b8\xb7'),
        'surrounded_empty': int(not prev_line.strip() and not next_line.strip()),
        'contains_at':      int('@' in lc),
        'contains_www':     int('www' in lc.lower() or 'http' in lc.lower()),
        'word_count_small': int(1 <= len(words) <= 4),
        'is_md_h1':         int(lc.startswith('# ') and not lc.startswith('## ')),
        'is_md_h2':         int(lc.startswith('## ') and not lc.startswith('### ')),
        'is_md_h3':         int(lc.startswith('### ')),
        'is_md_bullet':     int(lc.startswith('- ') or lc.startswith('* ')),
        'is_md_hr':         int(lc == '---' or lc == '==='),
        'has_url':          int(bool(re.search(r'https?://|www\.', lc, re.I))),
        'starts_verb':      int(bool(re.match(
            r'^(?:develop|manag|design|implem|lead|build|creat|analys)', lc, re.I))),
        'has_semicolon':    int(';' in lc),
        'ends_colon':       int(lc.endswith(':')),
        'is_email_like':    int(bool(_EMAIL_RE.search(lc))),
        'is_phone_like':    int(bool(re.search(r'\+?\d[\d\s\-\.]{7,}', lc))),
        'char_variety':     round(char_variety, 3),
    }


FEATURE_NAMES: List[str] = list(extract_structural_features('test').keys())
N_FEATURES = len(FEATURE_NAMES)  # 58 — doit correspondre a n_features dans structure_model_metadata.json