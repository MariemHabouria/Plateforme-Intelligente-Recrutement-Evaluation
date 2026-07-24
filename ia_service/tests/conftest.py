# ia_service/tests/conftest.py

import os
import sys
from pathlib import Path

# Deux chemins sont necessaires :
# 1) ia_service/ lui-meme, pour que `from main import app` fonctionne
#    (main.py est directement dans ia_service/)
# 2) la racine du repo, pour que `from ia_service.routers... import ...`
#    fonctionne dans main.py (ia_service doit etre vu comme un package)
IA_SERVICE_DIR = Path(__file__).parent.parent
REPO_ROOT = IA_SERVICE_DIR.parent

sys.path.insert(0, str(IA_SERVICE_DIR))
sys.path.insert(0, str(REPO_ROOT))

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://test:test@localhost:5432/test_db"
)
os.environ.setdefault("UPLOAD_DIR", "/tmp/test_uploads")