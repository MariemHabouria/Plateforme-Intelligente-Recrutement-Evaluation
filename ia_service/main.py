# ia_service/main.py
# Fix perf : creation d'un pool asyncpg partage au demarrage (au lieu
# d'une connexion par requete) + event loop qui ne bloque plus sur le
# CPU-bound (voir scoring.py : parse_cv / cv_scorer.scorer via to_thread)

import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import asyncpg

# ── Configuration du logging — DOIT être fait avant de récupérer les loggers ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent / ".env"
    load_dotenv(_env_path)
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ia_service.routers.scoring import router as scoring_router
from ia_service.routers.feedback import router as feedback_router
from ia_service.config.scoring_config import refresh_config

log = logging.getLogger("ia_service")

logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
logging.getLogger("asyncpg").setLevel(logging.WARNING)
logging.getLogger("pdfplumber").setLevel(logging.WARNING)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5000,http://localhost:3000"
).split(",")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:mariem@localhost:5432/kilani_rh")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Démarrage du microservice IA — chargement de la configuration...")
    log.info(f"UPLOAD_DIR = {os.getenv('UPLOAD_DIR', '⚠ NON DEFINI')}")

    # Fix perf : un seul pool de connexions PostgreSQL reutilise par toutes
    # les requetes, au lieu d'ouvrir/fermer une connexion asyncpg par appel.
    # min_size/max_size a ajuster selon la charge attendue en prod.
    try:
        app.state.db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=10,
        )
        log.info("Pool PostgreSQL cree (min=2, max=10).")
    except Exception as e:
        log.warning(f"Impossible de creer le pool PostgreSQL au demarrage ({e})")
        app.state.db_pool = None

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
    if app.state.db_pool is not None:
        await app.state.db_pool.close()
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

# Include routers
app.include_router(scoring_router, prefix="", tags=["Scoring IA"])
app.include_router(feedback_router, prefix="/ai", tags=["Feedback IA"])

# Log all registered routes on startup
@app.on_event("startup")
async def log_routes():
    log.info("=== ROUTES ENREGISTRÉES ===")
    for route in app.routes:
        log.info(f"{route.methods} {route.path}")
    log.info("===========================")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "kilani-ia", "upload_dir": os.getenv("UPLOAD_DIR")}