# ia_service/cv_extractor/predictor.py
# Charge le modele ML (LightGBM) et predit le type de bloc de chaque ligne CV.
# Fallback automatique sur l'annotateur heuristique si le .pkl est absent.

import logging
import warnings
from pathlib import Path
import numpy as np
import pandas as pd

try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    import pickle
    HAS_JOBLIB = False

from .features import extract_structural_features, FEATURE_NAMES
from .annotator import annotate_line, BLOCK_NAMES

log = logging.getLogger("ia_service.predictor")

MODEL_PATH = Path(__file__).parent.parent / "models" / "structure_model.pkl"

_model = None
_model_loaded = False


def _load_model():
    """
    Charge le modele depuis le disque une seule fois (singleton).
    Utilise joblib (gere la compression zlib du .pkl).
    """
    global _model, _model_loaded
    if _model_loaded:
        return _model

    if MODEL_PATH.exists():
        try:
            if HAS_JOBLIB:
                _model = joblib.load(MODEL_PATH)
            else:
                with open(MODEL_PATH, "rb") as f:
                    import pickle
                    _model = pickle.load(f)
            size_kb = MODEL_PATH.stat().st_size / 1024
            loader  = "joblib" if HAS_JOBLIB else "pickle"
            log.info(f"Modele ML charge ({loader}) : {MODEL_PATH} ({size_kb:.1f} KB)")
            _model_loaded = True
        except Exception as e:
            log.error(f"Erreur chargement modele ML : {e}")
            _model = None
            _model_loaded = True
    else:
        log.warning(f"Modele ML absent : {MODEL_PATH}")
        log.warning("Fallback heuristique actif (annotator.py)")
        _model_loaded = True

    return _model


def is_ml_available() -> bool:
    _load_model()
    return _model is not None


def predict_block_type(
    line: str,
    prev: str = "",
    nxt: str = "",
    position: int = 0,
    total_lines: int = 1,
) -> str:
    """
    Predit le type de bloc d'une ligne de CV.

    Utilise un DataFrame pandas pour fournir les noms de features au modele
    LightGBM — evite le warning 'X does not have valid feature names'
    qui se repete a chaque ligne sinon.
    """
    model = _load_model()
    if model is not None:
        try:
            feats = extract_structural_features(line, prev, nxt, position, total_lines)
            # DataFrame au lieu de numpy array — fournit les noms de colonnes au modele
            X = pd.DataFrame([feats], columns=FEATURE_NAMES)
            # Silencer le warning residuel pendant predict() au cas ou
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                pred = model.predict(X)[0]
            result = BLOCK_NAMES[pred]
            log.debug(f"ML  : '{line[:40]}' -> {result}")
            return result
        except Exception as e:
            log.error(f"Erreur prediction ML (fallback heuristique) : {e}")

    result = BLOCK_NAMES[annotate_line(line, prev, nxt)]
    log.debug(f"Heu : '{line[:40]}' -> {result}")
    return result


def classify_cv_lines(cv_text: str) -> list:
    """
    Classifie toutes les lignes non vides d'un CV.

    Returns:
        Liste de dicts { index, line, type, confidence }
    """
    if not cv_text:
        return []

    lines       = cv_text.split("\n")
    total_lines = len(lines)
    ml_active   = is_ml_available()
    results     = []

    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            continue

        prev_line = lines[i - 1].strip() if i > 0 else ""
        next_line = lines[i + 1].strip() if i + 1 < total_lines else ""

        block_type = predict_block_type(
            line_stripped, prev_line, next_line,
            position=i, total_lines=total_lines,
        )

        results.append({
            "index":      i,
            "line":       line_stripped[:200],
            "type":       block_type,
            "confidence": 0.80 if ml_active else 0.60,
        })

    type_counts: dict = {}
    for r in results:
        type_counts[r["type"]] = type_counts.get(r["type"], 0) + 1

    mode = "LightGBM" if ml_active else "heuristique"
    log.info(f"Classification CV ({mode}) : {len(results)} lignes | {type_counts}")

    return results