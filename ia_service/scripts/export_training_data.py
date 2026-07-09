import os
import json
import asyncio
import asyncpg

DATABASE_URL = os.environ["DATABASE_URL"]

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
IA_DIR      = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(IA_DIR, "training_data", "feedbacks.json")
IDS_PATH    = os.path.join(IA_DIR, "training_data", "feedback_ids.json")


async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch("""
            SELECT "id", "cvParsed", "scoreIa", "decisionFinale", "offreId"
            FROM training_feedback
            WHERE "usedForTraining" = FALSE
            ORDER BY "createdAt" ASC
        """)

        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

        if not rows:
            print("Aucun nouveau feedback — arrêt.")
            with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
                json.dump([], f)
            with open(IDS_PATH, "w", encoding="utf-8") as f:
                json.dump([], f)
            return

        data = [
            {
                "cv_parsed": r["cvParsed"],
                "score_ia":  float(r["scoreIa"]) if r["scoreIa"] is not None else None,
                "decision":  r["decisionFinale"],
                "offre_id":  r["offreId"],
            }
            for r in rows
        ]
        ids = [r["id"] for r in rows]

        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        with open(IDS_PATH, "w", encoding="utf-8") as f:
            json.dump(ids, f)

        # IMPORTANT : on ne marque plus usedForTraining ici.
        # Ça se fait seulement après coup, une fois qu'on sait si le
        # retrain a réellement eu lieu (cf mark_feedback_used.py),
        # pour ne jamais "consommer" des feedbacks qui n'ont servi à rien.

        print(f"Exporté {len(data)} feedbacks → {OUTPUT_PATH}")

    finally:
        await conn.close()


asyncio.run(main())