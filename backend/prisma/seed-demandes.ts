// backend/prisma/seed-demandes.ts

import { PrismaClient, CircuitType, Role, StatutDemande, Motif, TypeContrat, Priorite } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// Mapping niveau → circuitType et budget suggere
const NIVEAU_CONFIG: Record<string, { circuitType: CircuitType; budgetMin: number; budgetMax: number; totalEtapes: number }> = {
  TECHNICIEN:       { circuitType: CircuitType.TECHNICIEN,       budgetMin: 800,  budgetMax: 1500,  totalEtapes: 2 },
  EMPLOYE:          { circuitType: CircuitType.EMPLOYE,          budgetMin: 1000, budgetMax: 2000,  totalEtapes: 2 },
  CADRE_DEBUTANT:   { circuitType: CircuitType.CADRE_DEBUTANT,   budgetMin: 2000, budgetMax: 3500,  totalEtapes: 3 },
  CADRE_CONFIRME:   { circuitType: CircuitType.CADRE_CONFIRME,   budgetMin: 3500, budgetMax: 5500,  totalEtapes: 4 },
  CADRE_SUPERIEUR:  { circuitType: CircuitType.CADRE_SUPERIEUR,  budgetMin: 5500, budgetMax: 9000,  totalEtapes: 5 },
  STRATEGIQUE:      { circuitType: CircuitType.STRATEGIQUE,      budgetMin: 9000, budgetMax: 20000, totalEtapes: 5 },
};

// Definition des validateurs naturels par niveau
const VALIDATEURS_PAR_NIVEAU: Record<string, string[]> = {
  TECHNICIEN:       ['MANAGER', 'DIRECTEUR', 'DRH'],
  EMPLOYE:          ['MANAGER', 'DIRECTEUR', 'DRH'],
  CADRE_DEBUTANT:   ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF'],
  CADRE_CONFIRME:   ['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA'],
  CADRE_SUPERIEUR:  ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'],
  STRATEGIQUE:      ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'],
};

// Niveaux qui necessitent un entretien direction
const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];
const NIVEAUX_AVEC_TECHNIQUE = ['TECHNICIEN', 'EMPLOYE', 'CADRE_DEBUTANT', 'CADRE_CONFIRME'];

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    'MANAGER': 'Manager',
    'DIRECTEUR': 'Directeur',
    'DRH': 'DRH',
    'DAF': 'DAF',
    'DGA': 'DGA',
    'DG': 'DG'
  };
  return labels[role] || role;
};

const determinerCircuit = (niveau: string, createurRole: string): { etapes: any[]; totalEtapes: number } => {
  const validateursNaturels = VALIDATEURS_PAR_NIVEAU[niveau] || ['DIRECTEUR', 'DRH'];
  const validateursFiltres = validateursNaturels.filter(role => role !== createurRole);
  const etapes = validateursFiltres.map((role, index) => ({
    niveau: index + 1,
    role: role,
    label: getRoleLabel(role),
    delai: 48
  }));
  return { etapes, totalEtapes: etapes.length };
};

async function main() {
  console.log('Debut du seed des demandes...');
  await prisma.$connect();

  // Nettoyage
  console.log('\nNettoyage des donnees existantes...');
  await prisma.entretien.deleteMany({});
  await prisma.candidature.deleteMany({});
  await prisma.disponibiliteInterviewer.deleteMany({});
  await prisma.offreEmploi.deleteMany({});
  await prisma.validationEtape.deleteMany({});
  await prisma.disponibilite.deleteMany({});
  await prisma.demandeRecrutement.deleteMany({});
  console.log('   Nettoyage termine');

  // Recuperation des utilisateurs
  const managerPharma = await prisma.user.findFirst({ where: { role: 'MANAGER', email: 'manager.pharma@kilani.tn' } });
  const managerSI = await prisma.user.findFirst({ where: { role: 'MANAGER', email: 'manager.si@kilani.tn' } });
  const managerMKT = await prisma.user.findFirst({ where: { role: 'MANAGER', email: 'manager.mkt@kilani.tn' } });

  const directionPharma = await prisma.direction.findFirst({ where: { code: 'DIR_PHARMA' } });
  const directionSI = await prisma.direction.findFirst({ where: { code: 'DIR_SI' } });
  const directionMKT = await prisma.direction.findFirst({ where: { code: 'DIR_MKT' } });

  const directeurPharma = await prisma.user.findFirst({ where: { role: 'DIRECTEUR', directionId: directionPharma?.id } });
  const directeurSI = await prisma.user.findFirst({ where: { role: 'DIRECTEUR', directionId: directionSI?.id } });
  const directeurMKT = await prisma.user.findFirst({ where: { role: 'DIRECTEUR', directionId: directionMKT?.id } });
  
  const drh = await prisma.user.findFirst({ where: { role: 'DRH' } });
  const daf = await prisma.user.findFirst({ where: { role: 'DAF' } });
  const dga = await prisma.user.findFirst({ where: { role: 'DGA' } });
  const dg = await prisma.user.findFirst({ where: { role: 'DG' } });

  const circuitTechnicien = await prisma.circuitConfig.findFirst({ where: { type: 'TECHNICIEN' } });
  const circuitEmploye = await prisma.circuitConfig.findFirst({ where: { type: 'EMPLOYE' } });
  const circuitCadreDebutant = await prisma.circuitConfig.findFirst({ where: { type: 'CADRE_DEBUTANT' } });
  const circuitCadreConfirme = await prisma.circuitConfig.findFirst({ where: { type: 'CADRE_CONFIRME' } });
  const circuitCadreSuperieur = await prisma.circuitConfig.findFirst({ where: { type: 'CADRE_SUPERIEUR' } });
  const circuitStrategique = await prisma.circuitConfig.findFirst({ where: { type: 'STRATEGIQUE' } });

  if (!managerPharma || !managerSI || !managerMKT || !directionPharma || !directionSI || !directionMKT) {
    throw new Error('Managers ou directions manquants');
  }
  if (!directeurPharma || !directeurSI || !directeurMKT || !drh || !daf || !dga || !dg) {
    throw new Error('Utilisateurs transversaux manquants');
  }

  const now = new Date();
  const plus15 = new Date(now); plus15.setDate(plus15.getDate() + 15);
  const plus30 = new Date(now); plus30.setDate(plus30.getDate() + 30);
  const plus60 = new Date(now); plus60.setDate(plus60.getDate() + 60);
  const plus48h = new Date(now); plus48h.setHours(plus48h.getHours() + 48);
  const hier = new Date(now); hier.setDate(hier.getDate() - 1);

  let refCounter = 1000;
  const ref = () => `DEM-${now.getFullYear()}-${String(++refCounter).padStart(3, '0')}`;

  const addCreneauxManager = async (managerId: string, demandeId: string, offsetDays: number[], niveau: string) => {
    if (!NIVEAUX_AVEC_TECHNIQUE.includes(niveau)) return;
    await prisma.disponibiliteInterviewer.createMany({
      data: offsetDays.map((d, i) => ({
        userId: managerId,
        demandeId,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + d),
        heureDebut: i % 2 === 0 ? '09:00' : '14:00',
        heureFin: i % 2 === 0 ? '10:00' : '15:00',
        reservee: false,
      })),
    });
  };

  const addCreneauxDirecteur = async (directeurId: string, demandeId: string, offsetDays: number[], niveau: string) => {
    if (!NIVEAUX_AVEC_DIRECTION.includes(niveau)) return;
    await prisma.disponibiliteInterviewer.createMany({
      data: offsetDays.map((d, i) => ({
        userId: directeurId,
        demandeId,
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + d),
        heureDebut: i % 2 === 0 ? '10:00' : '14:00',
        heureFin: i % 2 === 0 ? '11:00' : '15:00',
        reservee: false,
      })),
    });
  };

  const createDemande = async (data: {
    intitulePoste: string;
    niveau: string;
    description?: string;
    justification: string;
    motif: Motif;
    typeContrat: TypeContrat;
    priorite: Priorite;
    dateSouhaitee: Date;
    statut: StatutDemande;
    createurId: string;
    createurRole: string;
    managerId: string;
    directionId: string;
    etapeActuelle?: number;
    valideeAt?: Date;
    avecOffre?: boolean;
    avecCreneaux?: boolean;
  }) => {
    const config = NIVEAU_CONFIG[data.niveau];
    let circuitConfigId: string | undefined;
    switch (data.niveau) {
      case 'TECHNICIEN': circuitConfigId = circuitTechnicien?.id; break;
      case 'EMPLOYE': circuitConfigId = circuitEmploye?.id; break;
      case 'CADRE_DEBUTANT': circuitConfigId = circuitCadreDebutant?.id; break;
      case 'CADRE_CONFIRME': circuitConfigId = circuitCadreConfirme?.id; break;
      case 'CADRE_SUPERIEUR': circuitConfigId = circuitCadreSuperieur?.id; break;
      case 'STRATEGIQUE': circuitConfigId = circuitStrategique?.id; break;
    }
    const { totalEtapes } = determinerCircuit(data.niveau, data.createurRole);
    
    const demande = await prisma.demandeRecrutement.create({
      data: {
        reference: ref(),
        intitulePoste: data.intitulePoste,
        description: data.description,
        justification: data.justification,
        motif: data.motif,
        typeContrat: data.typeContrat,
        priorite: data.priorite,
        budgetMin: config.budgetMin,
        budgetMax: config.budgetMax,
        dateSouhaitee: data.dateSouhaitee,
        statut: data.statut,
        niveau: data.niveau as CircuitType,
        circuitType: config.circuitType,
        totalEtapes: totalEtapes,
        etapeActuelle: data.etapeActuelle ?? 0,
        valideeAt: data.valideeAt,
        circuitConfigId,
        createurId: data.createurId,
        managerId: data.managerId,
        directionId: data.directionId,
      },
    });

    if (data.avecCreneaux) {
      await addCreneauxManager(data.managerId, demande.id, [5, 6], data.niveau);
      await addCreneauxDirecteur(
        data.niveau === 'CADRE_SUPERIEUR' || data.niveau === 'STRATEGIQUE' 
          ? (data.directionId === directionPharma.id ? directeurPharma.id : 
             data.directionId === directionSI.id ? directeurSI.id : directeurMKT.id)
          : '',
        demande.id, [8, 9], data.niveau
      );
    }

    if (data.avecOffre && data.statut === 'VALIDEE') {
      const offreRef = `OFF-${now.getFullYear()}-${data.directionId === directionPharma.id ? 'PHARMA' : data.directionId === directionSI.id ? 'SI' : 'MKT'}-${Math.floor(Math.random() * 1000)}`;
      await prisma.offreEmploi.create({
        data: {
          reference: offreRef,
          intitule: data.intitulePoste,
          typeContrat: data.typeContrat,
          statut: 'PUBLIEE',
          rhId: drh.id,
          demandeId: demande.id,
          lienCandidature: `http://localhost:5173/candidature/token-${Date.now()}`,
          description: data.description || '',
          competences: [],
        },
      });
    }

    return demande;
  };

  // ============================================================
  // CAS 1: BROUILLON - Manager Pharma (pas d'offre)
  // ============================================================
  console.log('\n=== CAS 1: BROUILLON (Manager Pharma) ===');
  await createDemande({
    intitulePoste: 'Technicien laboratoire',
    niveau: 'TECHNICIEN',
    description: 'Poste technique',
    justification: 'Besoin operationnel',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'MOYENNE',
    dateSouhaitee: plus30,
    statut: 'BROUILLON',
    createurId: managerPharma.id,
    createurRole: 'MANAGER',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    avecOffre: false,
    avecCreneaux: false,
  });

  // ============================================================
  // CAS 2: SOUMISE - Manager SI (en attente validation)
  // ============================================================
  console.log('\n=== CAS 2: SOUMISE (Manager SI) ===');
  const demandeSoumise = await createDemande({
    intitulePoste: 'Support IT',
    niveau: 'EMPLOYE',
    description: 'Support technique',
    justification: 'Depart collaborateur',
    motif: 'REMPLACEMENT',
    typeContrat: 'CDI',
    priorite: 'MOYENNE',
    dateSouhaitee: plus30,
    statut: 'SOUMISE',
    createurId: managerSI.id,
    createurRole: 'MANAGER',
    managerId: managerSI.id,
    directionId: directionSI.id,
    avecOffre: false,
    avecCreneaux: false,
  });

  // ============================================================
  // CAS 3: EN_VALIDATION_DIR - Manager MKT (attente Directeur)
  // ============================================================
  console.log('\n=== CAS 3: EN_VALIDATION_DIR (Manager MKT) ===');
  const demandeDir = await createDemande({
    intitulePoste: 'Community Manager',
    niveau: 'CADRE_DEBUTANT',
    description: 'Gestion des reseaux sociaux',
    justification: 'Lancement campagne',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus30,
    statut: 'EN_VALIDATION_DIR',
    createurId: managerMKT.id,
    createurRole: 'MANAGER',
    managerId: managerMKT.id,
    directionId: directionMKT.id,
    avecOffre: false,
    avecCreneaux: false,
  });
  await prisma.validationEtape.create({
    data: { demandeId: demandeDir.id, niveauEtape: 1, acteurId: directeurMKT.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
  });

  // ============================================================
  // CAS 4: EN_VALIDATION_DRH - Manager Pharma (Directeur a valide, attente DRH)
  // ============================================================
  console.log('\n=== CAS 4: EN_VALIDATION_DRH (Manager Pharma) ===');
  const demandeDrh = await createDemande({
    intitulePoste: 'Chef produit junior',
    niveau: 'CADRE_DEBUTANT',
    description: 'Assistance chef produit',
    justification: 'Renforcement equipe',
    motif: 'RENFORCEMENT',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus30,
    statut: 'EN_VALIDATION_DRH',
    createurId: managerPharma.id,
    createurRole: 'MANAGER',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    avecOffre: false,
    avecCreneaux: false,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDrh.id, niveauEtape: 1, acteurId: directeurPharma.id, decision: 'VALIDEE', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDrh.id, niveauEtape: 2, acteurId: drh.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ],
  });

  // ============================================================
  // CAS 5: EN_VALIDATION_DAF - DRH (attente DAF)
  // ============================================================
  console.log('\n=== CAS 5: EN_VALIDATION_DAF (DRH) ===');
  const demandeDaf = await createDemande({
    intitulePoste: 'Responsable RH',
    niveau: 'CADRE_CONFIRME',
    description: 'Gestion des ressources humaines',
    justification: 'Creation pole RH',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DAF',
    createurId: drh.id,
    createurRole: 'DRH',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    avecOffre: false,
    avecCreneaux: false,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDaf.id, niveauEtape: 1, acteurId: directeurPharma.id, decision: 'VALIDEE', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDaf.id, niveauEtape: 2, acteurId: drh.id, decision: 'VALIDEE', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDaf.id, niveauEtape: 3, acteurId: daf.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ],
  });

  // ============================================================
  // CAS 6: VALIDEE AVEC OFFRE - DAF (CADRE_SUPERIEUR)
  // ============================================================
  console.log('\n=== CAS 6: VALIDEE AVEC OFFRE (DAF) ===');
  await createDemande({
    intitulePoste: 'Directeur Commercial',
    niveau: 'CADRE_SUPERIEUR',
    description: 'Direction commerciale',
    justification: 'Strategie commerciale',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'VALIDEE',
    createurId: daf.id,
    createurRole: 'DAF',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    etapeActuelle: 4,
    valideeAt: now,
    avecOffre: true,
    avecCreneaux: true,
  });

  // ============================================================
  // CAS 7: VALIDEE AVEC OFFRE - DG (STRATEGIQUE)
  // ============================================================
  console.log('\n=== CAS 7: VALIDEE AVEC OFFRE (DG) ===');
  await createDemande({
    intitulePoste: 'Directeur General Adjoint',
    niveau: 'STRATEGIQUE',
    description: 'Assistance DG',
    justification: 'Organisation groupe',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'VALIDEE',
    createurId: dg.id,
    createurRole: 'DG',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    etapeActuelle: 4,
    valideeAt: now,
    avecOffre: true,
    avecCreneaux: true,
  });

  // ============================================================
  // CAS 8: REJETEE - Manager MKT (refus DRH)
  // ============================================================
  console.log('\n=== CAS 8: REJETEE (Manager MKT) ===');
  const demandeRejetee = await createDemande({
    intitulePoste: 'Graphiste',
    niveau: 'EMPLOYE',
    description: 'Creation graphique',
    justification: 'Support marketing',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'BASSE',
    dateSouhaitee: plus30,
    statut: 'REJETEE',
    createurId: managerMKT.id,
    createurRole: 'MANAGER',
    managerId: managerMKT.id,
    directionId: directionMKT.id,
    avecOffre: false,
    avecCreneaux: false,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeRejetee.id, niveauEtape: 1, acteurId: directeurMKT.id, decision: 'VALIDEE', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeRejetee.id, niveauEtape: 2, acteurId: drh.id, decision: 'REFUSEE', commentaire: 'Budget non dispo', dateDecision: now, dateLimite: plus48h },
    ],
  });

  // ============================================================
  // CAS 9: ANNULEE - Manager Pharma
  // ============================================================
  console.log('\n=== CAS 9: ANNULEE (Manager Pharma) ===');
  await createDemande({
    intitulePoste: 'Assistant RH',
    niveau: 'EMPLOYE',
    description: 'Support RH',
    justification: 'Charge temporaire',
    motif: 'CREATION',
    typeContrat: 'CDD',
    priorite: 'BASSE',
    dateSouhaitee: plus30,
    statut: 'ANNULEE',
    createurId: managerPharma.id,
    createurRole: 'MANAGER',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    avecOffre: false,
    avecCreneaux: false,
  });

  // ============================================================
  // CAS 10: VALIDEE SANS OFFRE - Manager SI (attente creation offre)
  // ============================================================
  console.log('\n=== CAS 10: VALIDEE SANS OFFRE (Manager SI) ===');
  await createDemande({
    intitulePoste: 'Developpeur Full Stack',
    niveau: 'CADRE_CONFIRME',
    description: 'Developpement web',
    justification: 'Nouveau projet',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus30,
    statut: 'VALIDEE',
    createurId: managerSI.id,
    createurRole: 'MANAGER',
    managerId: managerSI.id,
    directionId: directionSI.id,
    etapeActuelle: 3,
    valideeAt: now,
    avecOffre: false,  // ✅ PAS D'OFFRE
    avecCreneaux: true,
  });

  // ============================================================
  // CAS 11: EN_VALIDATION_DGA - DAF (attente DGA)
  // ============================================================
  console.log('\n=== CAS 11: EN_VALIDATION_DGA (DAF) ===');
  const demandeDga = await createDemande({
    intitulePoste: 'Directeur Innovation',
    niveau: 'STRATEGIQUE',
    description: 'Pilotage innovation',
    justification: 'Strategie groupe',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DGA',
    createurId: daf.id,
    createurRole: 'DAF',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    avecOffre: false,
    avecCreneaux: false,
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demandeDga.id, niveauEtape: 1, acteurId: directeurPharma.id, decision: 'VALIDEE', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDga.id, niveauEtape: 2, acteurId: drh.id, decision: 'VALIDEE', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDga.id, niveauEtape: 3, acteurId: daf.id, decision: 'VALIDEE', dateDecision: now, dateLimite: plus48h },
      { demandeId: demandeDga.id, niveauEtape: 4, acteurId: dga.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ],
  });

  // ============================================================
  // CAS 12: DIRECTEUR cree demande (Manager doit valider)
  // ============================================================
  console.log('\n=== CAS 12: DIRECTEUR cree CADRE_DEBUTANT ===');
  const demandeDirecteur = await createDemande({
    intitulePoste: 'Chef de projet digital',
    niveau: 'CADRE_DEBUTANT',
    description: 'Pilotage projets digitaux',
    justification: 'Transformation digitale',
    motif: 'CREATION',
    typeContrat: 'CDI',
    priorite: 'HAUTE',
    dateSouhaitee: plus60,
    statut: 'EN_VALIDATION_DIR',
    createurId: directeurPharma.id,
    createurRole: 'DIRECTEUR',
    managerId: managerPharma.id,
    directionId: directionPharma.id,
    avecOffre: false,
    avecCreneaux: false,
  });
  await prisma.validationEtape.create({
    data: { demandeId: demandeDirecteur.id, niveauEtape: 1, acteurId: managerPharma.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
  });

  // ============================================================
  // STATISTIQUES FINALES
  // ============================================================
  const total = await prisma.demandeRecrutement.count();
  const parStatut = await prisma.demandeRecrutement.groupBy({
    by: ['statut'],
    _count: true
  });
  const offresCount = await prisma.offreEmploi.count();
  const offresPubliees = await prisma.offreEmploi.count({ where: { statut: 'PUBLIEE' } });

  console.log(`\n=== RESUME DU SEED ===`);
  console.log(`Demandes totales: ${total}`);
  console.log(`Repartition par statut:`);
  for (const s of parStatut) {
    console.log(`   - ${s.statut}: ${s._count}`);
  }
  console.log(`Offres totales: ${offresCount}`);
  console.log(`Offres publiees: ${offresPubliees}`);
  
  console.log(`\n=== CAS TESTES ===`);
  console.log(`1. BROUILLON - En cours de redaction`);
  console.log(`2. SOUMISE - En attente de validation`);
  console.log(`3. EN_VALIDATION_DIR - Attente Directeur`);
  console.log(`4. EN_VALIDATION_DRH - Attente DRH`);
  console.log(`5. EN_VALIDATION_DAF - Attente DAF`);
  console.log(`6. EN_VALIDATION_DGA - Attente DGA`);
  console.log(`7. VALIDEE AVEC OFFRE - Poste pourvu`);
  console.log(`8. REJETEE - Demande refusee`);
  console.log(`9. ANNULEE - Demande annulee`);
  console.log(`10. VALIDEE SANS OFFRE - En attente creation offre`);
  console.log(`11. DIRECTEUR CREATEUR - Validation par Manager requise`);
}

main()
  .catch(e => { console.error('Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());