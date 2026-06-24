import os
import json
import asyncio
import asyncpg

DATABASE_URL = os.environ["DATABASE_URL"]


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

        os.makedirs("ia_service/training_data", exist_ok=True)
        with open("ia_service/training_data/feedbacks.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        await conn.execute("""
            UPDATE training_feedback
            SET "usedForTraining" = TRUE
            WHERE "usedForTraining" = FALSE
        """)

        print(f"Exporté {len(data)} feedbacks.")

    finally:
        await conn.close()


asyncio.run(main())