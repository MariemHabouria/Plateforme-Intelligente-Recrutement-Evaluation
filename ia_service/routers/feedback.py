import os
import json
import logging

import asyncpg
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

log = logging.getLogger("ia_service.routers")
router = APIRouter()

# Fail-fast : aucune connexion Postgres locale par défaut.
# En prod (Neon), DATABASE_URL DOIT être injectée via .env / secrets GitHub Actions.
try:
    DATABASE_URL = os.environ["DATABASE_URL"]
except KeyError:
    raise RuntimeError(
        "DATABASE_URL manquant — vérifie le .env (local) ou les secrets "
        "GitHub Actions / variables d'environnement (prod). "
        "Aucun fallback vers un Postgres local n'est autorisé."
    )

# Baseline F1 du modèle initial (cellule 42 de layer1)
# Celui-ci peut garder un défaut : c'est un seuil métier, pas une connexion DB.
BASELINE_F1 = float(os.getenv("BASELINE_F1", "0.72"))


# ── Schémas ───────────────────────────────────────────────────────────────────

class FeedbackPayload(BaseModel):
    cv_parsed:       dict
    score_ia:        float
    decision_finale: str    # 'RETENU' ou 'REJETE'
    offre_id:        str


class RetranResult(BaseModel):
    promoted: bool
    new_f1:   float
    old_f1:   float = 0.0


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/feedback")
async def save_feedback(payload: FeedbackPayload):
    try:
        conn = await asyncpg.connect(DATABASE_URL, timeout=5)
        try:
            await conn.execute(
                """
                INSERT INTO training_feedback
                    (id, "cvParsed", "scoreIa", "decisionFinale", "offreId")
                VALUES ($1, $2, $3, $4, $5)
                """,
                str(uuid.uuid4()),
                json.dumps(payload.cv_parsed),
                payload.score_ia,
                payload.decision_finale,
                payload.offre_id,
            )

            count = await conn.fetchval(
                'SELECT COUNT(*) FROM training_feedback WHERE "usedForTraining" = FALSE'
            )
        finally:
            await conn.close()

        return {
            "saved":             True,
            "pending_labels":    int(count),
            "threshold_reached": int(count) >= 5,
        }

    except asyncpg.PostgresConnectionError as e:
        log.error(f"Erreur connexion PostgreSQL (feedback): {e}")
        raise HTTPException(status_code=503, detail="Base de données indisponible")

    except Exception as e:
        log.error(f"Erreur save_feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/drift")
async def check_drift():
    """
    Appelé par n8n chaque lundi à 6h.
    Compare le score_ia moyen des 30 derniers jours avec la baseline F1 initiale.
    Retourne alert=true si la dérive dépasse 0.15.
    """
    try:
        conn = await asyncpg.connect(DATABASE_URL, timeout=5)
        try:
            recent_avg = await conn.fetchval(
                """
                SELECT AVG("scoreIa")
                FROM training_feedback
                WHERE "createdAt" >= NOW() - INTERVAL '30 days'
                  AND "decisionFinale" IS NOT NULL
                """
            )
        finally:
            await conn.close()

        recent_avg = float(recent_avg) if recent_avg is not None else BASELINE_F1
        drift      = abs(recent_avg - BASELINE_F1)

        log.info(f"Drift check — recent_avg={recent_avg:.4f} baseline={BASELINE_F1:.4f} drift={drift:.4f}")

        return {
            "drift":        round(drift, 4),
            "recent_avg":   round(recent_avg, 4),
            "baseline":     BASELINE_F1,
            "alert":        drift > 0.15,
        }

    except asyncpg.PostgresConnectionError as e:
        log.error(f"Erreur connexion PostgreSQL (drift): {e}")
        raise HTTPException(status_code=503, detail="Base de données indisponible")

    except Exception as e:
        log.error(f"Erreur check_drift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrain/done")
async def retrain_done(payload: RetranResult):
    """
    Appelé par GitHub Actions à la fin du ré-entraînement.
    Reçoit le résultat (promoted, new_f1, old_f1) et logue le résultat.
    Si promoted=true, le nouveau .pkl est déjà sur le repo —
    redémarre le service pour le charger (ou recharge manuellement).
    """
    if payload.promoted:
        log.info(
            f"Nouveau modèle promu — F1: {payload.old_f1:.4f} → {payload.new_f1:.4f}"
        )
    else:
        log.info(
            f"Ré-entraînement terminé sans promotion — "
            f"new_f1={payload.new_f1:.4f} old_f1={payload.old_f1:.4f}"
        )

    return {
        "received": True,
        "promoted": payload.promoted,
        "new_f1":   payload.new_f1,
        "old_f1":   payload.old_f1,
    }