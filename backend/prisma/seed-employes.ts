// backend/prisma/seed-evaluations-pe.ts

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// ✅ Utilisation standard de PrismaClient (sans adapter)
const prisma = new PrismaClient();

async function main() {
  console.log('Seed des evaluations PE - Workflow: Resp Paie → Manager → Directeur');
  await prisma.$connect();

  // Nettoyer avant seed
  await prisma.evaluationValidation.deleteMany({});
  await prisma.evaluationPE.deleteMany({});
  console.log('Anciennes evaluations supprimees');

  // Récupérer les directions
  const directionPharma = await prisma.direction.findFirst({ where: { code: 'DIR_PHARMA' } });
  const directionSI = await prisma.direction.findFirst({ where: { code: 'DIR_SI' } });
  const directionMKT = await prisma.direction.findFirst({ where: { code: 'DIR_MKT' } });

  // Récupérer les managers par direction
  const managerPharma = await prisma.user.findFirst({ 
    where: { role: 'MANAGER', directionId: directionPharma?.id, actif: true }
  });
  const managerSI = await prisma.user.findFirst({ 
    where: { role: 'MANAGER', directionId: directionSI?.id, actif: true }
  });
  const managerMKT = await prisma.user.findFirst({ 
    where: { role: 'MANAGER', directionId: directionMKT?.id, actif: true }
  });

  // Récupérer les directeurs par direction
  const directeurPharma = await prisma.user.findFirst({ 
    where: { role: 'DIRECTEUR', directionId: directionPharma?.id, actif: true }
  });
  const directeurSI = await prisma.user.findFirst({ 
    where: { role: 'DIRECTEUR', directionId: directionSI?.id, actif: true }
  });
  const directeurMKT = await prisma.user.findFirst({ 
    where: { role: 'DIRECTEUR', directionId: directionMKT?.id, actif: true }
  });

  // Récupérer les employés par direction
  const employesPharma = await prisma.user.findMany({
    where: { role: 'EMPLOYE', directionId: directionPharma?.id, actif: true }
  });
  const employesSI = await prisma.user.findMany({
    where: { role: 'EMPLOYE', directionId: directionSI?.id, actif: true }
  });
  const employesMKT = await prisma.user.findMany({
    where: { role: 'EMPLOYE', directionId: directionMKT?.id, actif: true }
  });

  // Récupérer les contrats
  const contrats = await prisma.contrat.findMany();

  if (contrats.length === 0) {
    console.log('⚠️ Aucun contrat trouve');
    return;
  }

  if (!managerPharma || !managerSI || !managerMKT) {
    console.log('⚠️ Managers non trouves');
    return;
  }
  if (!directeurPharma || !directeurSI || !directeurMKT) {
    console.log('⚠️ Directeurs non trouves');
    return;
  }

  const now = new Date();
  const deuxMoisAvant = new Date(now);
  deuxMoisAvant.setMonth(deuxMoisAvant.getMonth() - 2);

  let contractIndex = 0;
  let evalCount = 0;

  console.log('\n=== CREATION DES EVALUATIONS ===\n');

  // CAS 1: BROUILLON (En attente saisie Paie)
  if (employesPharma[0] && contrats[contractIndex]) {
    const dateFin = new Date(now);
    dateFin.setDate(now.getDate() + 45);
    
    await prisma.evaluationPE.create({
      data: {
        reference: `EVAL-${now.getFullYear()}-0001`,
        employeId: employesPharma[0].id,
        managerId: managerPharma.id,
        contratId: contrats[contractIndex].id,
        dateDebut: deuxMoisAvant,
        dateFin: dateFin,
        joursRestants: 45,
        statut: 'BROUILLON',
        etapeActuelle: 0,
        totalEtapes: 3
      }
    });
    console.log(`✅ BROUILLON - ${employesPharma[0].prenom} ${employesPharma[0].nom} (Attente saisie Paie)`);
    contractIndex++;
    evalCount++;
  }

  // CAS 2: EN_VALIDATION_DIR (Manager a soumis, attente Directeur)
  if (employesPharma[1] && contrats[contractIndex]) {
    const dateFin = new Date(now);
    dateFin.setDate(now.getDate() + 30);
    
    await prisma.evaluationPE.create({
      data: {
        reference: `EVAL-${now.getFullYear()}-0002`,
        employeId: employesPharma[1].id,
        managerId: managerPharma.id,
        contratId: contrats[contractIndex].id,
        dateDebut: deuxMoisAvant,
        dateFin: dateFin,
        joursRestants: 30,
        evaluationN1: "Employe performant, respecte les objectifs.",
        commentaireN1: "Je recommande la confirmation.",
        decision: 'CONFIRMATION',
        dateSoumissionN1: new Date(),
        statut: 'EN_VALIDATION_DIR',
        etapeActuelle: 1,
        totalEtapes: 3
      }
    });
    console.log(`✅ EN_VALIDATION_DIR - ${employesPharma[1].prenom} ${employesPharma[1].nom} (Manager a evalue, attente Directeur)`);
    contractIndex++;
    evalCount++;
  }

  // CAS 3: EN_VALIDATION_DIR avec evaluation
  if (employesSI[0] && contrats[contractIndex]) {
    const dateFin = new Date(now);
    dateFin.setDate(now.getDate() + 25);
    
    await prisma.evaluationPE.create({
      data: {
        reference: `EVAL-${now.getFullYear()}-0003`,
        employeId: employesSI[0].id,
        managerId: managerSI.id,
        contratId: contrats[contractIndex].id,
        dateDebut: deuxMoisAvant,
        dateFin: dateFin,
        joursRestants: 25,
        evaluationN1: "Employe tres performant, depasse les objectifs.",
        commentaireN1: "Je recommande vivement la confirmation.",
        decision: 'CONFIRMATION',
        dateSoumissionN1: new Date(),
        statut: 'EN_VALIDATION_DIR',
        etapeActuelle: 1,
        totalEtapes: 3
      }
    });
    console.log(`✅ EN_VALIDATION_DIR - ${employesSI[0].prenom} ${employesSI[0].nom} (Manager a evalue)`);
    contractIndex++;
    evalCount++;
  }

  // CAS 4: VALIDEE (Finalisee par Directeur)
  if (employesSI[1] && contrats[contractIndex]) {
    const dateFin = new Date(now);
    dateFin.setDate(now.getDate() - 5);
    
    await prisma.evaluationPE.create({
      data: {
        reference: `EVAL-${now.getFullYear()}-0004`,
        employeId: employesSI[1].id,
        managerId: managerSI.id,
        contratId: contrats[contractIndex].id,
        dateDebut: deuxMoisAvant,
        dateFin: dateFin,
        joursRestants: -5,
        evaluationN1: "Excellent employe, depasse tous les objectifs.",
        commentaireN1: "Confirmation sans reserve.",
        decision: 'CONFIRMATION',
        dateSoumissionN1: new Date(),
        evaluationN2: "Je confirme la decision du manager.",
        commentaireN2: "Excellent profil",
        dateDecisionN2: new Date(),
        evaluationN1Masquee: true,
        statut: 'VALIDEE',
        etapeActuelle: 2,
        totalEtapes: 3,
        valideeAt: new Date()
      }
    });
    console.log(`✅ VALIDEE - ${employesSI[1].prenom} ${employesSI[1].nom} (Evaluation finalisee)`);
    contractIndex++;
    evalCount++;
  }

  // CAS 5: REJETEE
  if (employesMKT[1] && contrats[contractIndex]) {
    const dateFin = new Date(now);
    dateFin.setDate(now.getDate() + 10);
    
    await prisma.evaluationPE.create({
      data: {
        reference: `EVAL-${now.getFullYear()}-0005`,
        employeId: employesMKT[1].id,
        managerId: managerMKT.id,
        contratId: contrats[contractIndex].id,
        dateDebut: deuxMoisAvant,
        dateFin: dateFin,
        joursRestants: 10,
        evaluationN1: "Performance insuffisante, retards repetes.",
        commentaireN1: "Je recommande la rupture.",
        decision: 'RUPTURE',
        justificationRupture: "Non respect des delais",
        dateSoumissionN1: new Date(),
        statut: 'REJETEE',
        etapeActuelle: 1,
        totalEtapes: 3
      }
    });
    console.log(`✅ REJETEE - ${employesMKT[1].prenom} ${employesMKT[1].nom} (Evaluation rejetee)`);
    contractIndex++;
    evalCount++;
  }

  const total = await prisma.evaluationPE.count();
  const parStatut = await prisma.evaluationPE.groupBy({
    by: ['statut'],
    _count: true
  });
  
  console.log(`\n=== RESUME ===`);
  console.log(`Evaluations totales: ${total}`);
  console.log(`Repartition par statut:`);
  for (const s of parStatut) {
    console.log(`   - ${s.statut}: ${s._count}`);
  }
  
  console.log(`\n✅ Seed termine: ${evalCount} evaluations creees`);
  console.log(`\n📋 WORKFLOW (3 etapes):`);
  console.log(`   1. BROUILLON → Resp. Paie saisit les donnees`);
  console.log(`   2. EN_VALIDATION_DIR → Manager evalue`);
  console.log(`   3. EN_VALIDATION_DIR → Directeur valide`);
  console.log(`   4. VALIDEE → Finalisee`);
}

main()
  .catch(e => { console.error('Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());