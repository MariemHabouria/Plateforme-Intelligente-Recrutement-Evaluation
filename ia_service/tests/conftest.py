# ia_service/tests/conftest.py
#
# Fournit une DATABASE_URL factice pendant les tests, pour que
# `main.py` ne leve pas d'erreur au chargement (voir le fix de securite
# qui rend DATABASE_URL obligatoire). La connexion reelle echouera,
# mais c'est deja gere par le try/except dans le lifespan de main.py
# (le service demarre quand meme, juste sans pool DB actif).

import os
import sys
from pathlib import Path

# main.py fait `from ia_service.routers.scoring import ...` : ia_service
# est un package Python, donc c'est la racine du repo (parent de
# ia_service/) qu'il faut ajouter au sys.path, pas ia_service/ lui-meme.
#
# Path(__file__)              -> .../ia_service/tests/conftest.py
# Path(__file__).parent       -> .../ia_service/tests
# Path(__file__).parent.parent -> .../ia_service
# Path(__file__).parent.parent.parent -> .../kilaniG   <-- la racine
REPO_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://test:test@localhost:5432/test_db"
)
os.environ.setdefault("UPLOAD_DIR", "/tmp/test_uploads")