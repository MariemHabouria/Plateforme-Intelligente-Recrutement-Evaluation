-- CreateTable
CREATE TABLE "training_feedback" (
    "id" TEXT NOT NULL,
    "cvParsed" JSONB NOT NULL,
    "scoreIa" DOUBLE PRECISION,
    "decisionFinale" TEXT,
    "offreId" TEXT,
    "usedForTraining" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_feedback_pkey" PRIMARY KEY ("id")
);
