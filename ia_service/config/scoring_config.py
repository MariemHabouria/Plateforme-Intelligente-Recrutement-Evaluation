# ia_service/config/scoring_config.py
# Charge la configuration de scoring dynamiquement depuis PostgreSQL
# Le Super Admin peut modifier les poids via l'interface sans redémarrer le service
#
# Nom de table réel (schema.prisma @@map) : "scoring_configs"

import os
import asyncpg
import logging
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

log = logging.getLogger("ia_service.config")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:mariem@localhost:5432/kilani_rh"
)

DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"

RECOMMANDATIONS = [(80, "FORT"), (65, "BON"), (45, "MOYEN"), (0, "FAIBLE")]


@dataclass
class ScoringConfig:
    poids_competences: float = 0.35
    poids_experience:  float = 0.25
    poids_formation:   float = 0.20
    poids_semantique:  float = 0.12
    poids_completude:  float = 0.08
    seuil_matching:    int   = 70

    @property
    def poids(self) -> dict:
        return {
            "competences_techniques": self.poids_competences,
            "experience":             self.poids_experience,
            "formation":              self.poids_formation,
            "semantique":             self.poids_semantique,
            "completude":             self.poids_completude,
        }

    def recommandation_label(self, score: int) -> str:
        for seuil, label in RECOMMANDATIONS:
            if score >= seuil:
                return label
        return "NON_RECOMMANDE"

    def validate(self) -> bool:
        total = sum(self.poids.values())
        valid = abs(total - 1.0) < 0.001
        if not valid:
            log.warning(f"Somme des poids invalide: {total} (devrait être 1.0)")
        return valid

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


async def _ensure_table(conn) -> None:
    """Crée la table scoring_configs si elle n'existe pas."""
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS scoring_configs (
            id                 TEXT PRIMARY KEY,
            "poidsCompetences" FLOAT NOT NULL DEFAULT 0.35,
            "poidsExperience"  FLOAT NOT NULL DEFAULT 0.25,
            "poidsFormation"   FLOAT NOT NULL DEFAULT 0.20,
            "poidsSemantique"  FLOAT NOT NULL DEFAULT 0.12,
            "poidsCompletude"  FLOAT NOT NULL DEFAULT 0.08,
            "seuilMatching"    INTEGER NOT NULL DEFAULT 70,
            "updatedAt"        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedBy"        TEXT
        )
    """)
    # S'assurer que la colonne id n'est pas NULL sur les lignes existantes
    # (migration depuis l'ancienne DDL qui utilisait gen_random_uuid() côté SQL)
    await conn.execute("""
        UPDATE scoring_configs
        SET id = gen_random_uuid()::text
        WHERE id IS NULL
    """)


async def _ensure_default_row(conn) -> None:
    """Insère la ligne de config par défaut si la table est vide."""
    import uuid
    count = await conn.fetchval('SELECT COUNT(*) FROM scoring_configs')
    if count == 0:
        # UUID généré côté Python — évite la dépendance à gen_random_uuid()
        # (nécessite pgcrypto sur certaines versions de PostgreSQL)
        row_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO scoring_configs
                (id, "poidsCompetences", "poidsExperience", "poidsFormation",
                 "poidsSemantique", "poidsCompletude", "seuilMatching", "updatedAt")
            VALUES ($1, 0.35, 0.25, 0.20, 0.12, 0.08, 70, CURRENT_TIMESTAMP)
            """,
            row_id,
        )
        log.info(f"Configuration par défaut initialisée dans scoring_configs (id={row_id})")


async def load_config_from_db() -> ScoringConfig:
    """
    Charge la configuration depuis la table scoring_configs de PostgreSQL.
    Retourne la config par défaut si la table est vide ou inaccessible.
    """
    try:
        conn = await asyncpg.connect(DATABASE_URL, timeout=5)
        try:
            await _ensure_table(conn)
            await _ensure_default_row(conn)

            row = await conn.fetchrow(
                """
                SELECT "poidsCompetences", "poidsExperience", "poidsFormation",
                       "poidsSemantique", "poidsCompletude", "seuilMatching"
                FROM scoring_configs
                ORDER BY "updatedAt" DESC
                LIMIT 1
                """
            )
        finally:
            await conn.close()

        if row:
            config = ScoringConfig(
                poids_competences = float(row["poidsCompetences"]),
                poids_experience  = float(row["poidsExperience"]),
                poids_formation   = float(row["poidsFormation"]),
                poids_semantique  = float(row["poidsSemantique"]),
                poids_completude  = float(row["poidsCompletude"]),
                seuil_matching    = int(row["seuilMatching"]),
            )
            if not config.validate():
                log.warning("Poids invalides en BDD (somme ≠ 1.0), utilisation des défauts")
                return ScoringConfig()

            log.info(f"Config chargée depuis BDD — poids: {config.poids}")
            return config

    except asyncpg.PostgresConnectionError as e:
        log.warning(f"Impossible de se connecter à PostgreSQL: {e}")
    except Exception as e:
        log.warning(f"Impossible de charger la config depuis BDD: {e} — utilisation des défauts")

    log.info("Utilisation de la configuration par défaut")
    return ScoringConfig()


_cached_config: Optional[ScoringConfig] = None


async def get_config() -> ScoringConfig:
    global _cached_config
    if _cached_config is None:
        _cached_config = await load_config_from_db()
    return _cached_config


async def refresh_config() -> ScoringConfig:
    """Force le rechargement depuis la BDD (appelé après PUT /scoring-config)."""
    global _cached_config
    _cached_config = await load_config_from_db()
    log.info("Configuration rafraîchie")
    return _cached_config

# Fix important : get_config_sync() supprimée.
#
# La version précédente utilisait concurrent.futures + asyncio.run() depuis
# un contexte potentiellement déjà async, ce qui causait des deadlocks.
# Elle n'était utilisée nulle part dans le codebase.
#
# Si un appel synchrone est un jour nécessaire (ex: script CLI de diagnostic),
# utiliser directement :
#   import asyncio
#   config = asyncio.run(load_config_from_db())
# depuis un contexte garantit sans event loop active.