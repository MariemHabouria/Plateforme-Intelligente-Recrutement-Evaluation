// backend/prisma/seed-demandes.ts

import { PrismaClient, CircuitType, Role, StatutDemande, Motif, TypeContrat, Priorite } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// Mapping niveau → circuitType et budget suggéré
const NIVEAU_CONFIG: Record<string, { circuitType: CircuitType; budgetMin: number; budgetMax: number; totalEtapes: number }> = {
  TECHNICIEN: { circuitType: CircuitType.TECHNICIEN, budgetMin: 800, budgetMax: 1500, totalEtapes: 2 },
  EMPLOYE: { circuitType: CircuitType.EMPLOYE, budgetMin: 1000, budgetMax: 2000, totalEtapes: 2 },
  CADRE_DEBUTANT: { circuitType: CircuitType.CADRE_DEBUTANT, budgetMin: 2000, budgetMax: 3500, totalEtapes: 3 },
  CADRE_CONFIRME: { circuitType: CircuitType.CADRE_CONFIRME, budgetMin: 3500, budgetMax: 5500, totalEtapes: 4 },
  CADRE_SUPERIEUR: { circuitType: CircuitType.CADRE_SUPERIEUR, budgetMin: 5500, budgetMax: 9000, totalEtapes: 5 },
  STRATEGIQUE: { circuitType: CircuitType.STRATEGIQUE, budgetMin: 9000, budgetMax: 20000, totalEtapes: 5 },
};

async function main() {
  console.log('🌱 Début du seed des demandes...');
  await prisma.$connect();

  // ─── Récupérer les données existantes ───────────────────
  const manager      = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
  const directeur    = await prisma.user.findFirst({ where: { role: 'DIRECTEUR' } });
  const drh          = await prisma.user.findFirst({ where: { role: 'DRH' } });
  const daf          = await prisma.user.findFirst({ where: { role: 'DAF' } });
  const dga          = await prisma.user.findFirst({ where: { role: 'DGA' } });
  const dg           = await prisma.user.findFirst({ where: { role: 'DG' } });
  const superAdmin   = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });

  const direction    = await prisma.direction.findFirst({ where: { actif: true } });
  
  // Récupérer les circuits config
  const circuitTechnicien     = await prisma.circuitConfig.findFirst({ where: { type: 'TECHNICIEN' } });
  const circuitEmploye        = await prisma.circuitConfig.findFirst({ where: { type: 'EMPLOYE' } });
  const circuitCadreDebutant  = await prisma.circuitConfig.findFirst({ where: { type: 'CADRE_DEBUTANT' } });
  const circuitCadreConfirme  = await prisma.circuitConfig.findFirst({ where: { type: 'CADRE_CONFIRME' } });
  const circuitCadreSuperieur = await prisma.circuitConfig.findFirst({ where: { type: 'CADRE_SUPERIEUR' } });
  const circuitStrategique    = await prisma.circuitConfig.findFirst({ where: { type: 'STRATEGIQUE' } });

  if (!manager || !directeur || !drh || !daf || !dga || !dg || !superAdmin || !direction) {
    throw new Error('❌ Utilisateurs ou direction manquants. Lancez d\'abord le seed principal.');
  }

  const now    = new Date();
  const plus30 = new Date(now); plus30.setDate(plus30.getDate() + 30);
  const plus60 = new Date(now); plus60.setDate(plus60.getDate() + 60);
  const plus48h = new Date(now); plus48h.setHours(plus48h.getHours() + 48);
  const depasse48h = new Date(now); depasse48h.setHours(depasse48h.getHours() - 1);

  let refCounter = 1000;
  const ref = () => `DEM-${now.getFullYear()}-${String(++refCounter).padStart(3, '0')}`;

  // Helper pour créer une demande avec niveau
  const createDemandeWithNiveau = async (data: {
    intitulePoste: string;
    niveau: string;
    description?: string;
    justification: string;
    motif: Motif;
    commentaireMotif?: string;
    personneRemplaceeNom?: string;
    fonctionRemplacee?: string;
    typeContrat: TypeContrat;
    priorite: Priorite;
    dateSouhaitee: Date;
    statut: StatutDemande;
    createurId: string;
    managerId: string;
    directionId: string;
    etapeActuelle?: number;
    valideeAt?: Date;
  }) => {
    const config = NIVEAU_CONFIG[data.niveau];
    if (!config) throw new Error(`Niveau invalide: ${data.niveau}`);

    // Trouver le circuit config correspondant
    let circuitConfigId: string | undefined;
    switch (data.niveau) {
      case 'TECHNICIEN': circuitConfigId = circuitTechnicien?.id; break;
      case 'EMPLOYE': circuitConfigId = circuitEmploye?.id; break;
      case 'CADRE_DEBUTANT': circuitConfigId = circuitCadreDebutant?.id; break;
      case 'CADRE_CONFIRME': circuitConfigId = circuitCadreConfirme?.id; break;
      case 'CADRE_SUPERIEUR': circuitConfigId = circuitCadreSuperieur?.id; break;
      case 'STRATEGIQUE': circuitConfigId = circuitStrategique?.id; break;
    }

    return prisma.demandeRecrutement.create({
      data: {
        reference: ref(),
        intitulePoste: data.intitulePoste,
        description: data.description,
        justification: data.justification,
        motif: data.motif,
        commentaireMotif: data.commentaireMotif,
        personneRemplaceeNom: data.personneRemplaceeNom,
        fonctionRemplacee: data.fonctionRemplacee,
        typeContrat: data.typeContrat,
        priorite: data.priorite,
        budgetMin: config.budgetMin,
        budgetMax: config.budgetMax,
        dateSouhaitee: data.dateSouhaitee,
        statut: data.statut,
        niveau: data.niveau as CircuitType,
        circuitType: config.circuitType,
        totalEtapes: config.totalEtapes,
        etapeActuelle: data.etapeActuelle || 0,
        valideeAt: data.valideeAt,
        circuitConfigId: circuitConfigId,
        createurId: data.createurId,
        managerId: data.managerId,
        directionId: data.directionId,
      }
    });
  };

  // ============================================================
  // 1. BROUILLON (Manager)
  // ============================================================
  console.log('\n📝 1. BROUILLON');
  await createDemandeWithNiveau({
    intitulePoste: 'Technicien de laboratoire junior',
    niveau: 'TECHNICIEN',
    description: 'Poste de technicien en support qualite.',
    justification: 'Charge de travail accrue sur le labo.',
    motif: 'CREATION',
    commentaireMotif: 'Nouvelle ligne de production ouverte.',
    typeContrat: 'CDI',
    priorite: 'BASSE',
    dateSouhaitee: plus30,
    statut: 'BROUILLON',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
  });
  console.log('   BROUILLON cree (Manager)');

  // ============================================================
  // 2. SOUMISE (Manager)
  // ============================================================
  console.log('\n📤 2. SOUMISE');
  await createDemandeWithNiveau({
    intitulePoste: 'Assistant qualite',
    niveau: 'EMPLOYE',
    description: 'Suivi des procedures qualite internes.',
    justification: 'Depart d\'un collaborateur en juin.',
    motif: 'REMPLACEMENT',
    personneRemplaceeNom: 'Youssef Trabelsi',
    fonctionRemplacee: 'Assistant qualite',
    typeContrat: 'CDI',
    priorite: 'MOYENNE',
    dateSouhaitee: plus30,
    statut: 'SOUMISE',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
  });
  console.log('   SOUMISE creee (Manager)');

  // ============================================================
  // 3. EN_VALIDATION_DIR (Manager) → DIR en attente
  // ============================================================
  console.log('\n🔵 3. EN_VALIDATION_DIR');
  const demandeDir = await createDemandeWithNiveau({
    intitulePoste: 'Ingenieur qualite junior',
    niveau: 'CADRE_DEBUTANT',
    description: 'Renforcement de l\'equipe QA.',
    justification: 'Lancement de 3 nouveaux projets en Q3.',
    motif: 'RENFORCEMENT',
    commentaireMotif: 'Besoin urgent de competences QA.',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus30,
    statut: 'EN_VALIDATION_DIR',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 0,
  });
  await prisma.validationEtape.create({
    data: {
      demandeId: demandeDir.id,
      niveauEtape: 1,
      acteurId: directeur.id,
      decision: 'EN_ATTENTE',
      dateLimite: plus48h,
    }
  });
  console.log('   EN_VALIDATION_DIR creee (Manager → DIR en attente)');

  // ============================================================
  // 4. EN_VALIDATION_DRH (Manager) → DIR validé, RH en attente
  // ============================================================
  console.log('\n🟣 4. EN_VALIDATION_DRH');
  const demandeDrh = await createDemandeWithNiveau({
    intitulePoste: 'Chef de produit',
    niveau: 'CADRE_CONFIRME',
    description: 'Pilotage d\'une gamme pharmaceutique.',
    justification: 'Extension de la gamme OTC.',
    motif: 'NOUVEAU_POSTE',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus30,
    statut: 'EN_VALIDATION_DRH',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 1,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDrh.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Poste justifie. OK.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDrh.id, niveauEtape: 2, acteurId: drh.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   EN_VALIDATION_DRH creee (Manager → DIR validé, RH en attente)');

  // ============================================================
  // 5. EN_VALIDATION_DAF (Manager) → DIR, RH validés, DAF en attente
  // ============================================================
  console.log('\n🟡 5. EN_VALIDATION_DAF');
  const demandeDaf = await createDemandeWithNiveau({
    intitulePoste: 'Directeur commercial Pharma',
    niveau: 'CADRE_SUPERIEUR',
    description: 'Developpement du reseau de distribution.',
    justification: 'Ouverture de 3 nouvelles regions.',
    motif: 'EXPANSION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DAF',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 2,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDaf.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Approuve.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDaf.id, niveauEtape: 2, acteurId: drh.id, decision: 'VALIDEE', commentaire: 'Profil valide RH.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDaf.id, niveauEtape: 3, acteurId: daf.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   EN_VALIDATION_DAF creee (Manager → DAF en attente)');

  // ============================================================
  // 6. EN_VALIDATION_DGA (Manager) → DIR, RH, DAF validés, DGA en attente
  // ============================================================
  console.log('\n🟠 6. EN_VALIDATION_DGA');
  const demandeDga = await createDemandeWithNiveau({
    intitulePoste: 'Directeur technique (CTO)',
    niveau: 'STRATEGIQUE',
    description: 'Supervision de la strategie IT.',
    justification: 'Depart a la retraite du CTO actuel.',
    motif: 'REMPLACEMENT',
    personneRemplaceeNom: 'Rachid Hamrouni',
    fonctionRemplacee: 'CTO',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DGA',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 3,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDga.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Besoin confirme.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDga.id, niveauEtape: 2, acteurId: drh.id, decision: 'VALIDEE', commentaire: 'Grille salariale OK.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDga.id, niveauEtape: 3, acteurId: daf.id, decision: 'VALIDEE', commentaire: 'Budget valide.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDga.id, niveauEtape: 4, acteurId: dga.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   EN_VALIDATION_DGA creee (Manager → DGA en attente)');

  // ============================================================
  // 7. EN_VALIDATION_DG (DIRECTEUR créateur)
  // ============================================================
  console.log('\n🔴 7. EN_VALIDATION_DG (Créateur = DIRECTEUR)');
  const demandeDg = await createDemandeWithNiveau({
    intitulePoste: 'Directeur general adjoint SI',
    niveau: 'STRATEGIQUE',
    description: 'DGA en charge de la transformation digitale.',
    justification: 'Projet de digitalisation groupe sur 3 ans.',
    motif: 'NOUVEAU_POSTE',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DG',
    createurId: directeur.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 3,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDg.id, niveauEtape: 1, acteurId: drh.id, decision: 'VALIDEE', commentaire: 'Plan de recrutement valide.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDg.id, niveauEtape: 2, acteurId: daf.id, decision: 'VALIDEE', commentaire: 'Enveloppe budget accordee.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDg.id, niveauEtape: 3, acteurId: dga.id, decision: 'VALIDEE', commentaire: 'Opportunite strategique.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDg.id, niveauEtape: 4, acteurId: dg.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   EN_VALIDATION_DG creee (DIRECTEUR créateur)');

  // ============================================================
  // 8. EN_VALIDATION_DAF (DRH créateur)
  // ============================================================
  console.log('\n🟡 8. EN_VALIDATION_DAF (Créateur = DRH)');
  const demandeDafDrh = await createDemandeWithNiveau({
    intitulePoste: 'Responsable formation',
    niveau: 'CADRE_CONFIRME',
    description: 'Pilotage de la politique de formation.',
    justification: 'Mise en place du plan de formation 2026.',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'MOYENNE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DAF',
    createurId: drh.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 2,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDafDrh.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Besoin valide.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDafDrh.id, niveauEtape: 2, acteurId: drh.id, decision: 'VALIDEE', commentaire: 'Auto-validation RH', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDafDrh.id, niveauEtape: 3, acteurId: daf.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   EN_VALIDATION_DAF creee (DRH créateur)');

  // ============================================================
  // 9. DEMANDE AVEC DELAI DEPASSE
  // ============================================================
  console.log('\n⚠️ 9. DEMANDE AVEC DELAI DEPASSE');
  const demandeDepassee = await createDemandeWithNiveau({
    intitulePoste: 'Chef de projet IT',
    niveau: 'CADRE_DEBUTANT',
    description: 'Coordination des projets digitaux.',
    justification: 'Charge projet en augmentation.',
    motif: 'RENFORCEMENT',
    commentaireMotif: '2 projets majeurs a livrer en 2026.',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus30,
    statut: 'EN_VALIDATION_DIR',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 0,
  });
  await prisma.validationEtape.create({
    data: {
      demandeId: demandeDepassee.id,
      niveauEtape: 1,
      acteurId: directeur.id,
      decision: 'EN_ATTENTE',
      dateLimite: depasse48h,
    }
  });
  console.log('   Demande avec delai depasse creee');

  // ============================================================
  // 10. VALIDEE SANS OFFRE
  // ============================================================
  console.log('\n✅ 10. VALIDEE SANS OFFRE');
  const demandeValideeSansOffre = await createDemandeWithNiveau({
    intitulePoste: 'Developpeur full stack',
    niveau: 'CADRE_DEBUTANT',
    description: 'Developpement de l\'ERP interne.',
    justification: 'Roadmap technique 2025.',
    motif: 'RENFORCEMENT',
    commentaireMotif: 'Equipe insuffisante pour tenir la roadmap.',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus30,
    statut: 'VALIDEE',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 3,
    valideeAt: now,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeValideeSansOffre.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Besoin reel.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeValideeSansOffre.id, niveauEtape: 2, acteurId: drh.id, decision: 'VALIDEE', commentaire: 'Profil disponible.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeValideeSansOffre.id, niveauEtape: 3, acteurId: daf.id, decision: 'VALIDEE', commentaire: 'Budget OK.', dateDecision: now, dateLimite: plus48h },
    ]
  });
  console.log('   VALIDEE SANS OFFRE creee');

  // ============================================================
  // 11. VALIDEE AVEC OFFRE
  // ============================================================
  console.log('\n✅ 11. VALIDEE AVEC OFFRE');
  const demandeValideeAvecOffre = await createDemandeWithNiveau({
    intitulePoste: 'Architecte cloud',
    niveau: 'CADRE_SUPERIEUR',
    description: 'Migration de l\'infrastructure vers le cloud.',
    justification: 'Stratégie cloud-first 2026.',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'VALIDEE',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 5,
    valideeAt: now,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeValideeAvecOffre.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'OK', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeValideeAvecOffre.id, niveauEtape: 2, acteurId: drh.id, decision: 'VALIDEE', commentaire: 'Profil OK', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeValideeAvecOffre.id, niveauEtape: 3, acteurId: daf.id, decision: 'VALIDEE', commentaire: 'Budget OK', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeValideeAvecOffre.id, niveauEtape: 4, acteurId: dga.id, decision: 'VALIDEE', commentaire: 'Stratégique', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeValideeAvecOffre.id, niveauEtape: 5, acteurId: dg.id, decision: 'VALIDEE', commentaire: 'Approuve', dateDecision: now, dateLimite: plus48h },
    ]
  });

  // Créer l'offre associée
  const offreRef = `OFF-${now.getFullYear()}-${String(await prisma.offreEmploi.count() + 1).padStart(4, '0')}`;
  await prisma.offreEmploi.create({
    data: {
      reference: offreRef,
      intitule: demandeValideeAvecOffre.intitulePoste,
      typeContrat: 'CDI',
      statut: 'BROUILLON',
      rhId: drh.id,
      demandeId: demandeValideeAvecOffre.id,
    }
  });
  console.log('   VALIDEE AVEC OFFRE creee');

  // ============================================================
  // 12. REJETEE
  // ============================================================
  console.log('\n❌ 12. REJETEE');
  const demandeRejetee = await createDemandeWithNiveau({
    intitulePoste: 'Lead developpeur',
    niveau: 'CADRE_CONFIRME',
    description: 'Lead technique front-end.',
    justification: 'Ameliorer la qualite du code frontend.',
    motif: 'RENFORCEMENT',
    commentaireMotif: 'Dette technique trop importante.',
    typeContrat: 'CDD',
    priorite: 'MOYENNE',
    dateSouhaitee: plus30,
    statut: 'REJETEE',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 1,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeRejetee.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'OK de mon cote.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeRejetee.id, niveauEtape: 2, acteurId: drh.id, decision: 'REFUSEE', commentaire: 'Budget non disponible en H1.', dateDecision: now, dateLimite: plus48h },
    ]
  });
  console.log('   REJETEE creee');

  // ============================================================
  // 13. ANNULEE
  // ============================================================
  console.log('\n🚫 13. ANNULEE');
  await createDemandeWithNiveau({
    intitulePoste: 'Community manager',
    niveau: 'TECHNICIEN',
    description: 'Animation des reseaux sociaux.',
    justification: 'Strategie digitale 2025.',
    motif: 'NOUVEAU_POSTE',
    typeContrat: 'STAGE',
    priorite: 'BASSE',
    dateSouhaitee: plus30,
    statut: 'ANNULEE',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 0,
  });
  console.log('   ANNULEE creee');

  // ============================================================
  // 14. DEMANDE AVEC RELANCE
  // ============================================================
  console.log('\n📧 14. DEMANDE AVEC RELANCE');
  const demandeRelance = await createDemandeWithNiveau({
    intitulePoste: 'Data Scientist',
    niveau: 'CADRE_CONFIRME',
    description: 'Analyse des donnees commerciales.',
    justification: 'Mise en place du data lake.',
    motif: 'CREATION',
    commentaireMotif: 'Nouveau pole data.',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DRH',
    createurId: manager.id,
    managerId: manager.id,
    directionId: direction.id,
    etapeActuelle: 1,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeRelance.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'OK', dateDecision: now, dateLimite: depasse48h },
      { demandeId: demandeRelance.id, niveauEtape: 2, acteurId: drh.id, decision: 'EN_ATTENTE', dateLimite: depasse48h, relanceEnvoyee: true },
    ]
  });
  console.log('   Demande avec relance creee');

  // ============================================================
  // RESUME
  // ============================================================
  const total = await prisma.demandeRecrutement.count();
  const demandesValidees = await prisma.demandeRecrutement.count({ where: { statut: 'VALIDEE' } });
  const offresCount = await prisma.offreEmploi.count();
  
  console.log(`\n🎉 Seed termine ! Total demandes en base : ${total}`);
  console.log(`📊 Demandes validees : ${demandesValidees}`);
  console.log(`📊 Offres d'emploi : ${offresCount}`);
  console.log(`\n⚠️ Demande validee SANS offre (pour formulaire) : ${demandeValideeSansOffre.reference}`);
  console.log(`⚠️ Demande validee AVEC offre (pour tableau) : ${demandeValideeAvecOffre.reference}`);
  
  console.log('\n📊 STATUTS COUVERTS :');
  const statusCounts = await prisma.demandeRecrutement.groupBy({
    by: ['statut'],
    _count: { statut: true },
    orderBy: { statut: 'asc' }
  });
  statusCounts.forEach(s => console.log(`   ${s.statut.padEnd(28)} → ${s._count.statut} demande(s)`));
  
  console.log('\n📋 NIVEAUX DE POSTE UTILISES :');
  const niveauCounts = await prisma.demandeRecrutement.groupBy({
    by: ['niveau'],
    _count: { niveau: true },
    orderBy: { niveau: 'asc' }
  });
  niveauCounts.forEach(n => console.log(`   ${n.niveau.padEnd(20)} → ${n._count.niveau} demande(s)`));
}

main()
  .catch(e => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());