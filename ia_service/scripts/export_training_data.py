import os
import json
import asyncio
import asyncpg

DATABASE_URL = os.environ["DATABASE_URL"]

# Chemin absolu basé sur l'emplacement du script
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
IA_DIR       = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH  = os.path.join(IA_DIR, "training_data", "feedbacks.json")


async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch("""
            SELECT "cvParsed", "scoreIa", "decisionFinale", "offreId"
            FROM training_feedback
            WHERE "usedForTraining" = FALSE
            ORDER BY "createdAt" ASC
        """)

        if not rows:
            print("Aucun nouveau feedback — arrêt.")
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

        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        await conn.execute("""
            UPDATE training_feedback
            SET "usedForTraining" = TRUE
            WHERE "usedForTraining" = FALSE
        """)

        print(f"Exporté {len(data)} feedbacks → {OUTPUT_PATH}")

    finally:
        await conn.close()


asyncio.run(main())