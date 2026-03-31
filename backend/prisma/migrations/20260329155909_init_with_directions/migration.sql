-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'RESP_PAIE');

-- CreateEnum
CREATE TYPE "Motif" AS ENUM ('CREATION', 'REMPLACEMENT', 'RENFORCEMENT', 'NOUVEAU_POSTE', 'EXPANSION');

-- CreateEnum
CREATE TYPE "TypeContrat" AS ENUM ('CDI', 'CDD', 'STAGE', 'ALTERNANCE', 'FREELANCE');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('HAUTE', 'MOYENNE', 'BASSE');

-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('BROUILLON', 'SOUMISE', 'EN_VALIDATION_DIR', 'EN_VALIDATION_DRH', 'EN_VALIDATION_DAF', 'EN_VALIDATION_DGA', 'EN_VALIDATION_DG', 'EN_VALIDATION_CONSEIL', 'VALIDEE', 'REJETEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "DecisionEtape" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'MODIFIEE');

-- CreateEnum
CREATE TYPE "CircuitType" AS ENUM ('TECHNICIEN', 'EMPLOYE', 'CADRE_DEBUTANT', 'CADRE_CONFIRME', 'CADRE_SUPERIEUR', 'STRATEGIQUE', 'PERSONNALISE');

-- CreateTable
CREATE TABLE "directions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "departement" TEXT,
    "poste" TEXT,
    "telephone" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "dernierConnexion" TIMESTAMP(3),
    "directionId" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "backupCodes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circuit_configs" (
    "id" TEXT NOT NULL,
    "type" "CircuitType" NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "seuilMin" DOUBLE PRECISION,
    "seuilMax" DOUBLE PRECISION,
    "etapes" JSONB NOT NULL,
    "totalEtapes" INTEGER NOT NULL,
    "delaiParDefaut" INTEGER NOT NULL DEFAULT 48,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circuit_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "intitulePoste" TEXT NOT NULL,
    "description" TEXT,
    "justification" TEXT NOT NULL,
    "motif" "Motif" NOT NULL,
    "typeContrat" "TypeContrat" NOT NULL,
    "priorite" "Priorite" NOT NULL,
    "budgetEstime" DECIMAL(10,2) NOT NULL,
    "dateSouhaitee" TIMESTAMP(3) NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'BROUILLON',
    "circuitType" "CircuitType",
    "totalEtapes" INTEGER,
    "etapeActuelle" INTEGER NOT NULL DEFAULT 0,
    "circuitConfigId" TEXT,
    "valideeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerId" TEXT NOT NULL,
    "directionId" TEXT,

    CONSTRAINT "demandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations_etapes" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "niveauEtape" INTEGER NOT NULL,
    "acteurId" TEXT NOT NULL,
    "decision" "DecisionEtape" NOT NULL DEFAULT 'EN_ATTENTE',
    "commentaire" TEXT,
    "dateLimite" TIMESTAMP(3) NOT NULL,
    "relanceEnvoyee" BOOLEAN NOT NULL DEFAULT false,
    "dateDecision" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validations_etapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relance_jobs" (
    "id" TEXT NOT NULL,
    "validationEtapeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "datePrevue" TIMESTAMP(3) NOT NULL,
    "executee" BOOLEAN NOT NULL DEFAULT false,
    "executeeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relance_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilites" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,

    CONSTRAINT "disponibilites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offres" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "description" TEXT,
    "profilRecherche" TEXT,
    "competences" TEXT[],
    "fourchetteSalariale" TEXT,
    "typeContrat" "TypeContrat" NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "canauxPublication" TEXT[],
    "datePublication" TIMESTAMP(3),
    "demandeId" TEXT,
    "rhId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatures" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "cvUrl" TEXT NOT NULL,
    "cvTexte" TEXT,
    "scoreGlobal" INTEGER,
    "scoreExp" INTEGER,
    "competencesDetectees" TEXT[],
    "competencesManquantes" TEXT[],
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "consentementRGPD" BOOLEAN NOT NULL DEFAULT false,
    "consentementIA" BOOLEAN NOT NULL DEFAULT false,
    "dateSoumission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offreId" TEXT NOT NULL,

    CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entretiens" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "feedback" TEXT,
    "evaluation" INTEGER,
    "candidatureId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,

    CONSTRAINT "entretiens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrats" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "typeContrat" "TypeContrat" NOT NULL,
    "salaire" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "pdfUrl" TEXT,
    "candidatureId" TEXT NOT NULL,

    CONSTRAINT "contrats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations_pe" (
    "id" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "joursRestants" INTEGER NOT NULL,
    "decision" TEXT,
    "commentaire" TEXT,
    "commentaireManager" TEXT,
    "etapeActuelle" INTEGER NOT NULL,
    "employeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,

    CONSTRAINT "evaluations_pe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avenants" (
    "id" TEXT NOT NULL,
    "typeAvenant" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,

    CONSTRAINT "avenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lienAction" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "luAt" TIMESTAMP(3),
    "destinataireId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "anciennesValeurs" JSONB,
    "nouvellesValeurs" JSONB,
    "ipAdresse" TEXT,
    "userAgent" TEXT,
    "acteurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "directions_code_key" ON "directions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "circuit_configs_type_key" ON "circuit_configs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_reference_key" ON "demandes"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "offres_reference_key" ON "offres"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "offres_demandeId_key" ON "offres"("demandeId");

-- CreateIndex
CREATE UNIQUE INDEX "candidatures_reference_key" ON "candidatures"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "contrats_reference_key" ON "contrats"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "contrats_candidatureId_key" ON "contrats"("candidatureId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_pe_contratId_key" ON "evaluations_pe"("contratId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "directions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "directions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_circuitConfigId_fkey" FOREIGN KEY ("circuitConfigId") REFERENCES "circuit_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations_etapes" ADD CONSTRAINT "validations_etapes_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations_etapes" ADD CONSTRAINT "validations_etapes_acteurId_fkey" FOREIGN KEY ("acteurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relance_jobs" ADD CONSTRAINT "relance_jobs_validationEtapeId_fkey" FOREIGN KEY ("validationEtapeId") REFERENCES "validations_etapes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites" ADD CONSTRAINT "disponibilites_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "demandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offres" ADD CONSTRAINT "offres_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "demandes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "offres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES "candidatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES "candidatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_pe" ADD CONSTRAINT "evaluations_pe_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_pe" ADD CONSTRAINT "evaluations_pe_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations_pe" ADD CONSTRAINT "evaluations_pe_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "contrats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avenants" ADD CONSTRAINT "avenants_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "contrats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_acteurId_fkey" FOREIGN KEY ("acteurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
