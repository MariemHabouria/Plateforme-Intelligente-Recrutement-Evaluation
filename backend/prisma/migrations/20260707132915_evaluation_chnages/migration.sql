/*
  Warnings:

  - The values [EN_VALIDATION_DAF,EN_VALIDATION_DGA,EN_VALIDATION_DG] on the enum `StatutEvaluationPE` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatutEvaluationPE_new" AS ENUM ('BROUILLON', 'EN_VALIDATION_DIR', 'EN_VALIDATION_DRH', 'VALIDEE', 'REJETEE');
ALTER TABLE "public"."evaluations_pe" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "evaluations_pe" ALTER COLUMN "statut" TYPE "StatutEvaluationPE_new" USING ("statut"::text::"StatutEvaluationPE_new");
ALTER TYPE "StatutEvaluationPE" RENAME TO "StatutEvaluationPE_old";
ALTER TYPE "StatutEvaluationPE_new" RENAME TO "StatutEvaluationPE";
DROP TYPE "public"."StatutEvaluationPE_old";
ALTER TABLE "evaluations_pe" ALTER COLUMN "statut" SET DEFAULT 'BROUILLON';
COMMIT;
