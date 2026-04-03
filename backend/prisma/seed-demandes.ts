import { PrismaClient, CircuitType, Role, StatutDemande, Motif, TypeContrat, Priorite } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// ============================================================
// SEED - DEMANDES DE RECRUTEMENT (tous les statuts possibles)
// ============================================================

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
  const typePosteTechnicien    = await prisma.typePoste.findFirst({ where: { circuitType: 'TECHNICIEN' } });
  const typePosteEmploye       = await prisma.typePoste.findFirst({ where: { circuitType: 'EMPLOYE' } });
  const typePosteCadreDebutant = await prisma.typePoste.findFirst({ where: { circuitType: 'CADRE_DEBUTANT' } });
  const typePosteCadreConfirme = await prisma.typePoste.findFirst({ where: { circuitType: 'CADRE_CONFIRME' } });
  const typePosteCadreSuperieur= await prisma.typePoste.findFirst({ where: { circuitType: 'CADRE_SUPERIEUR' } });
  const typePosteStrategique   = await prisma.typePoste.findFirst({ where: { circuitType: 'STRATEGIQUE' } });

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
  const plus48h= new Date(now); plus48h.setHours(plus48h.getHours() + 48);

  // ─── Helper : générer une référence unique ──────────────
  let refCounter = 900;
  const ref = () => `DEM-${now.getFullYear()}-${String(++refCounter).padStart(3, '0')}`;

  // ═══════════════════════════════════════════════════════
  // 1. BROUILLON
  // ═══════════════════════════════════════════════════════
  console.log('\n📝 1. BROUILLON');
  await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Technicien de laboratoire junior',
      description:   'Poste de technicien en support qualité.',
      justification: 'Charge de travail accrue sur le labo.',
      motif:         'CREATION',
      commentaireMotif: 'Nouvelle ligne de production ouverte.',
      typeContrat:   'CDI',
      priorite:      'BASSE',
      budgetMin:     1200,
      budgetMax:     1600,
      dateSouhaitee: plus30,
      statut:        'BROUILLON',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteTechnicien?.id,
    }
  });
  console.log('   ✅ BROUILLON créé');

  // ═══════════════════════════════════════════════════════
  // 2. SOUMISE  (pas encore traitée par le Directeur)
  // ═══════════════════════════════════════════════════════
  console.log('\n📤 2. SOUMISE');
  await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Assistant qualité',
      description:   'Suivi des procédures qualité internes.',
      justification: 'Départ d\'un collaborateur en juin.',
      motif:         'REMPLACEMENT',
      personneRemplaceeNom: 'Youssef Trabelsi',
      fonctionRemplacee:    'Assistant qualité',
      typeContrat:   'CDI',
      priorite:      'MOYENNE',
      budgetMin:     1400,
      budgetMax:     1800,
      dateSouhaitee: plus30,
      statut:        'SOUMISE',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteEmploye?.id,
      circuitType:   'EMPLOYE',
      totalEtapes:   2,
      etapeActuelle: 0,
      circuitConfigId: circuitEmploye?.id,
    }
  });
  console.log('   ✅ SOUMISE créée');

  // ═══════════════════════════════════════════════════════
  // 3. EN_VALIDATION_DIR  (en attente du Directeur)
  // ═══════════════════════════════════════════════════════
  console.log('\n🔵 3. EN_VALIDATION_DIR');
  const demande_dir = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Ingénieur qualité junior',
      description:   'Renforcement de l\'équipe QA.',
      justification: 'Lancement de 3 nouveaux projets en Q3.',
      motif:         'RENFORCEMENT',
      commentaireMotif: 'Besoin urgent de compétences QA.',
      typeContrat:   'CDI',
      priorite:      'HAUTE',
      budgetMin:     2000,
      budgetMax:     2800,
      dateSouhaitee: plus30,
      statut:        'EN_VALIDATION_DIR',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteCadreDebutant?.id,
      circuitType:   'CADRE_DEBUTANT',
      totalEtapes:   3,
      etapeActuelle: 0,
      circuitConfigId: circuitCadreDebutant?.id,
    }
  });
  await prisma.validationEtape.create({
    data: {
      demandeId:  demande_dir.id,
      niveauEtape: 1,
      acteurId:   directeur.id,
      decision:   'EN_ATTENTE',
      dateLimite: plus48h,
    }
  });
  console.log('   ✅ EN_VALIDATION_DIR créée');

  // ═══════════════════════════════════════════════════════
  // 4. EN_VALIDATION_DRH
  // ═══════════════════════════════════════════════════════
  console.log('\n🟣 4. EN_VALIDATION_DRH');
  const demande_drh = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Chef de produit',
      description:   'Pilotage d\'une gamme pharmaceutique.',
      justification: 'Extension de la gamme OTC.',
      motif:         'NOUVEAU_POSTE',
      typeContrat:   'CDI',
      priorite:      'HAUTE',
      budgetMin:     3000,
      budgetMax:     4200,
      dateSouhaitee: plus30,
      statut:        'EN_VALIDATION_DRH',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteCadreConfirme?.id,
      circuitType:   'CADRE_CONFIRME',
      totalEtapes:   4,
      etapeActuelle: 1,
      circuitConfigId: circuitCadreConfirme?.id,
    }
  });
  // Étape 1 (DIR) déjà validée
  await prisma.validationEtape.create({
    data: {
      demandeId:   demande_drh.id,
      niveauEtape: 1,
      acteurId:    directeur.id,
      decision:    'VALIDEE',
      commentaire: 'Poste justifié. OK.',
      dateDecision: now,
      dateLimite:  plus48h,
    }
  });
  // Étape 2 (DRH) en attente
  await prisma.validationEtape.create({
    data: {
      demandeId:   demande_drh.id,
      niveauEtape: 2,
      acteurId:    drh.id,
      decision:    'EN_ATTENTE',
      dateLimite:  plus48h,
    }
  });
  console.log('   ✅ EN_VALIDATION_DRH créée');

  // ═══════════════════════════════════════════════════════
  // 5. EN_VALIDATION_DAF
  // ═══════════════════════════════════════════════════════
  console.log('\n🟡 5. EN_VALIDATION_DAF');
  const demande_daf = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Directeur commercial Pharma',
      description:   'Développement du réseau de distribution.',
      justification: 'Ouverture de 3 nouvelles régions.',
      motif:         'EXPANSION',
      typeContrat:   'CDI',
      priorite:      'HAUTE',
      budgetMin:     5000,
      budgetMax:     7000,
      dateSouhaitee: plus60,
      statut:        'EN_VALIDATION_DAF',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteCadreSuperieur?.id,
      circuitType:   'CADRE_SUPERIEUR',
      totalEtapes:   5,
      etapeActuelle: 2,
      circuitConfigId: circuitCadreSuperieur?.id,
    }
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demande_daf.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Approuvé.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_daf.id, niveauEtape: 2, acteurId: drh.id,       decision: 'VALIDEE', commentaire: 'Profil validé RH.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_daf.id, niveauEtape: 3, acteurId: daf.id,       decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   ✅ EN_VALIDATION_DAF créée');

  // ═══════════════════════════════════════════════════════
  // 6. EN_VALIDATION_DGA
  // ═══════════════════════════════════════════════════════
  console.log('\n🟠 6. EN_VALIDATION_DGA');
  const demande_dga = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Directeur technique (CTO)',
      description:   'Supervision de la stratégie IT.',
      justification: 'Départ à la retraite du CTO actuel.',
      motif:         'REMPLACEMENT',
      personneRemplaceeNom: 'Rachid Hamrouni',
      fonctionRemplacee:    'CTO',
      typeContrat:   'CDI',
      priorite:      'HAUTE',
      budgetMin:     8000,
      budgetMax:     12000,
      dateSouhaitee: plus60,
      statut:        'EN_VALIDATION_DGA',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteStrategique?.id,
      circuitType:   'STRATEGIQUE',
      totalEtapes:   6,
      etapeActuelle: 3,
      circuitConfigId: circuitStrategique?.id,
    }
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demande_dga.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Besoin confirmé.',     dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_dga.id, niveauEtape: 2, acteurId: drh.id,       decision: 'VALIDEE', commentaire: 'Grille salariale OK.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_dga.id, niveauEtape: 3, acteurId: daf.id,       decision: 'VALIDEE', commentaire: 'Budget validé.',        dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_dga.id, niveauEtape: 4, acteurId: dga.id,       decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   ✅ EN_VALIDATION_DGA créée');

  // ═══════════════════════════════════════════════════════
  // 7. EN_VALIDATION_DG
  // ═══════════════════════════════════════════════════════
  console.log('\n🔴 7. EN_VALIDATION_DG');
  const demande_dg = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Directeur général adjoint SI',
      description:   'DGA en charge de la transformation digitale.',
      justification: 'Projet de digitalisation groupe sur 3 ans.',
      motif:         'NOUVEAU_POSTE',
      typeContrat:   'CDI',
      priorite:      'HAUTE',
      budgetMin:     12000,
      budgetMax:     18000,
      dateSouhaitee: plus60,
      statut:        'EN_VALIDATION_DG',
      createurId:    directeur.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteStrategique?.id,
      circuitType:   'STRATEGIQUE',
      totalEtapes:   5,   // créateur=DIRECTEUR, donc étape DIR sautée → 5 restantes
      etapeActuelle: 4,
      circuitConfigId: circuitStrategique?.id,
    }
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demande_dg.id, niveauEtape: 1, acteurId: drh.id, decision: 'VALIDEE', commentaire: 'Plan de recrutement validé.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_dg.id, niveauEtape: 2, acteurId: daf.id, decision: 'VALIDEE', commentaire: 'Enveloppe budget accordée.',  dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_dg.id, niveauEtape: 3, acteurId: dga.id, decision: 'VALIDEE', commentaire: 'Opportunité stratégique.',   dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_dg.id, niveauEtape: 4, acteurId: dg.id,  decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   ✅ EN_VALIDATION_DG créée');

  // ═══════════════════════════════════════════════════════
  // 8. EN_VALIDATION_CONSEIL  (poste stratégique, dernière étape)
  // ═══════════════════════════════════════════════════════
  console.log('\n⚫ 8. EN_VALIDATION_CONSEIL');
  const demande_conseil = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Directeur général de filiale',
      description:   'Direction de la filiale Construction.',
      justification: 'Création de la filiale Kilani Construction SAS.',
      motif:         'CREATION',
      commentaireMotif: 'Nouvelle filiale à constituer.',
      typeContrat:   'CDI',
      priorite:      'HAUTE',
      budgetMin:     15000,
      budgetMax:     22000,
      dateSouhaitee: plus60,
      statut:        'EN_VALIDATION_CONSEIL',
      createurId:    dg.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteStrategique?.id,
      circuitType:   'STRATEGIQUE',
      totalEtapes:   2,  // créateur=DG → seules étapes DG+CONSEIL; DG auto-validée
      etapeActuelle: 5,
      circuitConfigId: circuitStrategique?.id,
    }
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demande_conseil.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Direction favorable.',   dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_conseil.id, niveauEtape: 2, acteurId: drh.id,       decision: 'VALIDEE', commentaire: 'Profil de poste validé.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_conseil.id, niveauEtape: 3, acteurId: daf.id,       decision: 'VALIDEE', commentaire: 'Budget accordé.',         dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_conseil.id, niveauEtape: 4, acteurId: dga.id,       decision: 'VALIDEE', commentaire: 'Aligné stratégie groupe.',dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_conseil.id, niveauEtape: 5, acteurId: dg.id,        decision: 'VALIDEE', commentaire: 'Approbation DG.',         dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_conseil.id, niveauEtape: 6, acteurId: superAdmin.id, decision: 'EN_ATTENTE', dateLimite: plus48h },
    ]
  });
  console.log('   ✅ EN_VALIDATION_CONSEIL créée');

  // ═══════════════════════════════════════════════════════
  // 9. VALIDEE  (+ offre générée)
  // ═══════════════════════════════════════════════════════
  console.log('\n✅ 9. VALIDEE');
  const demande_validee = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Développeur full stack',
      description:   'Développement de l\'ERP interne.',
      justification: 'Roadmap technique 2025.',
      motif:         'RENFORCEMENT',
      commentaireMotif: 'Équipe insuffisante pour tenir la roadmap.',
      typeContrat:   'CDI',
      priorite:      'HAUTE',
      budgetMin:     2500,
      budgetMax:     3500,
      dateSouhaitee: plus30,
      statut:        'VALIDEE',
      valideeAt:     now,
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteCadreDebutant?.id,
      circuitType:   'CADRE_DEBUTANT',
      totalEtapes:   3,
      etapeActuelle: 3,
      circuitConfigId: circuitCadreDebutant?.id,
    }
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demande_validee.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'Besoin réel.',       dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_validee.id, niveauEtape: 2, acteurId: drh.id,       decision: 'VALIDEE', commentaire: 'Profil disponible.', dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_validee.id, niveauEtape: 3, acteurId: daf.id,       decision: 'VALIDEE', commentaire: 'Budget OK.',          dateDecision: now, dateLimite: plus48h },
    ]
  });
  // Offre d'emploi associée
  const offreRef = `OFF-${now.getFullYear()}-${String(await prisma.offreEmploi.count() + 1).padStart(3, '0')}`;
  await prisma.offreEmploi.create({
    data: {
      reference:   offreRef,
      intitule:    demande_validee.intitulePoste,
      typeContrat: 'CDI',
      statut:      'BROUILLON',
      rhId:        drh.id,
      demandeId:   demande_validee.id,
    }
  });
  console.log('   ✅ VALIDEE créée (avec offre)');

  // ═══════════════════════════════════════════════════════
  // 10. REJETEE
  // ═══════════════════════════════════════════════════════
  console.log('\n❌ 10. REJETEE');
  const demande_rejetee = await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Lead développeur',
      description:   'Lead technique front-end.',
      justification: 'Améliorer la qualité du code frontend.',
      motif:         'RENFORCEMENT',
      commentaireMotif: 'Dette technique trop importante.',
      typeContrat:   'CDD',
      priorite:      'MOYENNE',
      budgetMin:     4000,
      budgetMax:     5500,
      dateSouhaitee: plus30,
      statut:        'REJETEE',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteCadreConfirme?.id,
      circuitType:   'CADRE_CONFIRME',
      totalEtapes:   4,
      etapeActuelle: 1,
      circuitConfigId: circuitCadreConfirme?.id,
    }
  });
  await prisma.validationEtape.createMany({
    data: [
      { demandeId: demande_rejetee.id, niveauEtape: 1, acteurId: directeur.id, decision: 'VALIDEE', commentaire: 'OK de mon côté.',          dateDecision: now, dateLimite: plus48h },
      { demandeId: demande_rejetee.id, niveauEtape: 2, acteurId: drh.id,       decision: 'REFUSEE', commentaire: 'Budget non disponible en H1.', dateDecision: now, dateLimite: plus48h },
    ]
  });
  console.log('   ✅ REJETEE créée');

  // ═══════════════════════════════════════════════════════
  // 11. ANNULEE
  // ═══════════════════════════════════════════════════════
  console.log('\n🚫 11. ANNULEE');
  await prisma.demandeRecrutement.create({
    data: {
      reference:     ref(),
      intitulePoste: 'Community manager',
      description:   'Animation des réseaux sociaux.',
      justification: 'Stratégie digitale 2025.',
      motif:         'NOUVEAU_POSTE',
      typeContrat:   'STAGE',
      priorite:      'BASSE',
      budgetMin:     600,
      budgetMax:     900,
      dateSouhaitee: plus30,
      statut:        'ANNULEE',
      createurId:    manager.id,
      managerId:     manager.id,
      directionId:   direction.id,
      typePosteId:   typePosteTechnicien?.id,
      circuitType:   'TECHNICIEN',
      totalEtapes:   2,
      etapeActuelle: 0,
      circuitConfigId: circuitTechnicien?.id,
    }
  });
  console.log('   ✅ ANNULEE créée');

  // ─── Résumé ──────────────────────────────────────────
  const total = await prisma.demandeRecrutement.count();
  console.log(`\n🎉 Seed terminé ! Total demandes en base : ${total}`);
  console.log('\n📊 STATUTS COUVERTS :');
  const statusCounts = await prisma.demandeRecrutement.groupBy({
    by: ['statut'],
    _count: { statut: true },
    orderBy: { statut: 'asc' }
  });
  statusCounts.forEach(s => console.log(`   ${s.statut.padEnd(28)} → ${s._count.statut} demande(s)`));
}

main()
  .catch(e => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());