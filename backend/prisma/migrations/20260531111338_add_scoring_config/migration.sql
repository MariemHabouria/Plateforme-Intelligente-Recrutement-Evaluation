-- CreateTable
CREATE TABLE "scoring_configs" (
    "id" TEXT NOT NULL,
    "poidsCompetences" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "poidsExperience" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "poidsFormation" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "poidsSemantique" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "poidsCompletude" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "seuilMatching" INTEGER NOT NULL DEFAULT 70,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_configs_pkey" PRIMARY KEY ("id")
);
