/*
  Warnings:

  - You are about to drop the column `typePosteId` on the `demandes` table. All the data in the column will be lost.
  - You are about to drop the `types_poste` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[disponibiliteId]` on the table `entretiens` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `entretiens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TypeEntretien" AS ENUM ('RH', 'TECHNIQUE', 'DIRECTION');

-- DropForeignKey
ALTER TABLE "demandes" DROP CONSTRAINT "demandes_typePosteId_fkey";

-- DropForeignKey
ALTER TABLE "types_poste" DROP CONSTRAINT "types_poste_directionId_fkey";

-- AlterTable
ALTER TABLE "demandes" DROP COLUMN "typePosteId",
ADD COLUMN     "niveau" "CircuitType" NOT NULL DEFAULT 'CADRE_CONFIRME';

-- AlterTable
ALTER TABLE "entretiens" ADD COLUMN     "disponibiliteId" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "TypeEntretien" NOT NULL;

-- DropTable
DROP TABLE "types_poste";

-- CreateTable
CREATE TABLE "disponibilites_interviewers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "reservee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disponibilites_interviewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entretiens_disponibiliteId_key" ON "entretiens"("disponibiliteId");

-- AddForeignKey
ALTER TABLE "disponibilites_interviewers" ADD CONSTRAINT "disponibilites_interviewers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites_interviewers" ADD CONSTRAINT "disponibilites_interviewers_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_disponibiliteId_fkey" FOREIGN KEY ("disponibiliteId") REFERENCES "disponibilites_interviewers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
