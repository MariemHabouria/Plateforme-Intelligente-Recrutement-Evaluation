import os
import json
import asyncio
import asyncpg

DATABASE_URL = os.environ["DATABASE_URL"]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IA_DIR     = os.path.dirname(SCRIPT_DIR)
IDS_PATH   = os.path.join(IA_DIR, "training_data", "feedback_ids.json")
RESULT_PATH = "retrain_result.json"


async def main():
    if not os.path.exists(IDS_PATH):
        print("Pas de feedback_ids.json — rien à marquer.")
        return

    with open(IDS_PATH, encoding="utf-8") as f:
        ids = json.load(f)

    if not ids:
        print("Aucun id à marquer (aucun feedback exporté ce run).")
        return

    if not os.path.exists(RESULT_PATH):
        print("Pas de retrain_result.json — entrainement non execute, "
              "feedbacks NON marques comme utilises.")
        return

    with open(RESULT_PATH, encoding="utf-8") as f:
        result = json.load(f)

    # On ne marque comme "utilisés" que les feedbacks qui ont réellement
    # participé à un entrainement (data_disponible = True côté notebook,
    # càd reason != 'no_data'). Peu importe si le modèle a été promu ou
    # non : soit le batch était trop petit / pas assez bon (les feedbacks
    # ont bien été essayés), soit reason == 'no_data' (rien n'a été
    # exploité — ne devrait pas arriver si ids non vide, mais on protège).
    entrainement_effectue = result.get("reason") != "no_data"

    if not entrainement_effectue:
        print("Entrainement non effectue (no_data) — feedbacks NON marques, "
              "ils resteront disponibles pour le prochain run.")
        return

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(
            """
            UPDATE training_feedback
            SET "usedForTraining" = TRUE
            WHERE id = ANY($1::text[])
            """,
            ids,
        )
        print(f"{len(ids)} feedbacks marques usedForTraining=TRUE "
              f"(promoted={result.get('promoted')}).")
    finally:
        await conn.close()


asyncio.run(main())