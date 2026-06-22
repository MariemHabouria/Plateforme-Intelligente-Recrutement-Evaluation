# ia_service/main.py
# Point d'entrée du microservice FastAPI IA
# Démarrage : uvicorn ia_service.main:app --host 0.0.0.0 --port 8001 --reload
#
# NE PAS appeler logging.basicConfig() ici.
# uvicorn configure le logging lui-même au démarrage du sous-process.
# Un basicConfig() concurrent cause un KeyboardInterrupt/deadlock sur _acquireLock()
# lors des rechargements --reload.

import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

# ── Chargement .env ───────────────────────────────────────────────────────────
# Doit être fait AVANT tout import qui lit os.getenv()
# Le .env se trouve dans le même dossier que ce fichier (ia_service/.env)
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent / ".env"
    load_dotenv(_env_path)
    # Pas de log ici — le système de logging n'est pas encore initialisé
except ImportError:
    pass  # python-dotenv absent : les variables doivent être définies manuellement

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.scoring import router as scoring_router
from .config.scoring_config import refresh_config

# ── Logging ───────────────────────────────────────────────────────────────────
log = logging.getLogger("ia_service")

logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
logging.getLogger("asyncpg").setLevel(logging.WARNING)
logging.getLogger("pdfplumber").setLevel(logging.WARNING)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5000,http://localhost:3000"
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Démarrage du microservice IA — chargement de la configuration...")
    log.info(f"UPLOAD_DIR = {os.getenv('UPLOAD_DIR', '⚠ NON DEFINI')}")
    try:
        await refresh_config()
        log.info("Configuration chargée depuis PostgreSQL.")
    except Exception as e:
        log.warning(
            f"Config BDD inaccessible au démarrage ({e}) "
            "— valeurs par défaut utilisées."
        )
    log.info("Microservice IA prêt.")
    yield
    log.info("Arrêt du microservice IA.")


app = FastAPI(
    title="Kilani RH — Microservice IA",
    description="Scoring CV/Offre (M3 Hybride) + Matching Inverse + Parse CV",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(scoring_router, prefix="", tags=["Scoring IA"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kilani-ia", "upload_dir": os.getenv("UPLOAD_DIR")}