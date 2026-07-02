// backend/prisma/seed-contrats.ts


import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import process from 'process';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seed des contrats + évaluations PE...');
  await prisma.$connect();

  console.log('\nNettoyage...');
  await prisma.evaluationValidation.deleteMany({});
  await prisma.evaluationPE.deleteMany({});
  await prisma.avenant.deleteMany({});
  await prisma.contrat.deleteMany({});
  console.log('   Done');

  // Récupérer les directions
  const directionPharma = await prisma.direction.findFirst({ where: { code: 'DIR_PHARMA' } });
  const directionSI     = await prisma.direction.findFirst({ where: { code: 'DIR_SI' } });
  const directionMKT    = await prisma.direction.findFirst({ where: { code: 'DIR_MKT' } });

  //  Récupérer managers et employés par direction (même pattern que seed-evaluations-pe)
  const managerPharma = await prisma.user.findFirst({
    where: { role: 'MANAGER', directionId: directionPharma?.id, actif: true }
  });
  const managerSI = await prisma.user.findFirst({
    where: { role: 'MANAGER', directionId: directionSI?.id, actif: true }
  });

  const employesPharma = await prisma.user.findMany({
    where: { role: 'EMPLOYE', directionId: directionPharma?.id, actif: true }
  });
  const employesSI = await prisma.user.findMany({
    where: { role: 'EMPLOYE', directionId: directionSI?.id, actif: true }
  });

  console.log(`\nDirection Pharma : ${directionPharma?.nom || '⚠️ non trouvée'}`);
  console.log(`Manager Pharma   : ${managerPharma ? `${managerPharma.prenom} ${managerPharma.nom}` : '⚠️ non trouvé'}`);
  console.log(`Employés Pharma  : ${employesPharma.length}`);
  console.log(`Direction SI     : ${directionSI?.nom || '⚠️ non trouvée'}`);
  console.log(`Manager SI       : ${managerSI ? `${managerSI.prenom} ${managerSI.nom}` : '⚠️ non trouvé'}`);
  console.log(`Employés SI      : ${employesSI.length}`);

  if (!managerPharma || !managerSI) {
    console.log('\n Managers non trouvés — lance seed-users.ts d\'abord');
    return;
  }
  if (employesPharma.length === 0 || employesSI.length === 0) {
    console.log('\n Employés non trouvés — lance seed-users.ts d\'abord');
    return;
  }

  //  Candidatures acceptées (hors sanscontrat)
  const candidaturesAcceptees = await prisma.candidature.findMany({
    where: {
      statut: 'ACCEPTEE',
      email: { notIn: ['candidat.sanscontrat@kilani.tn'] }
    },
    include: {
      offre: {
        include: { demande: { include: { direction: true } } }
      }
    }
  });

  console.log(`\nCandidatures acceptées (hors ignorées) : ${candidaturesAcceptees.length}`);
  if (candidaturesAcceptees.length === 0) {
    console.log(' Aucune candidature acceptée');
    return;
  }

  const now = new Date();

  //  Dates pour simuler une PE en cours à J-20
  const dateDebut = new Date(now);
  dateDebut.setDate(dateDebut.getDate() - 70); // commencé il y a 70 jours

  const dateFin = new Date(now);
  dateFin.setDate(dateFin.getDate() + 20);     // se termine dans 20 jours (J-20 → dans la fenêtre J-30)

  const joursRestants = 20;

  let contratCount = 0;
  let evalCount = 0;

  console.log('\n=== CRÉATION DES CONTRATS + ÉVALUATIONS ===\n');

  for (let i = 0; i < candidaturesAcceptees.length; i++) {
    const candidature = candidaturesAcceptees[i];

    const existingContrat = await prisma.contrat.findFirst({
      where: { candidatureId: candidature.id }
    });
    if (existingContrat) {
      console.log(`     Contrat déjà existant pour ${candidature.email}`);
      continue;
    }

    const typeContrat = candidature.offre?.typeContrat || 'CDI';
    const salaire     = candidature.offre?.demande?.budgetMax
      ? `${candidature.offre.demande.budgetMax} DT`
      : '3000 DT';

    const ficheData    = (candidature.ficheRenseignementData as Record<string, any>) || {};
    const directionNom = candidature.offre?.demande?.direction?.nom || '';

    const donneesContrat = {
      candidat: {
        nom: candidature.nom,
        prenom: candidature.prenom,
        email: candidature.email,
        telephone: candidature.telephone || '',
        adresse: ficheData.adresse || '',
        ville: ficheData.ville || '',
        dateNaissance: ficheData.dateNaissance || '',
        nationalite: ficheData.nationalite || '',
        situationFamiliale: ficheData.situationFamiliale || '',
        nombreEnfants: ficheData.nombreEnfants || ''
      },
      poste: {
        intitule: candidature.offre?.intitule || '',
        direction: directionNom,
        superieur: 'Manager direct',
        lieuTravail: 'Siège social - Tunis'
      },
      employeur: {
        nom: 'KILANI GROUPE',
        representant: 'M. Karim Kilani, Directeur Général',
        adresse: 'Immeuble Kilani, Centre Urbain Nord, Tunis'
      },
      contrat: {
        typeContrat,
        salaire,
        prime: '',
        avantages: '',
        clauseParticuliere: '',
        periodeEssaiDuree: '3',
        periodeEssaiRenouvelable: true,
        horairesHebdo: '40 heures',
        horairesPrecision: 'Du lundi au vendredi, 8h30 - 17h00',
        congesPayes: '30 jours ouvrables par an',
        preavis: '1 mois',
        observations: '',
        documentsFournis: ''
      }
    };

    //  Créer le contrat ACTIF
    const contrat = await prisma.contrat.create({
      data: {
        reference: `CTR-${now.getFullYear()}-${String(contratCount + 1).padStart(4, '0')}`,
        typeContrat: typeContrat as any,
        salaire,
        dateDebut,
        dateFin,
        statut: 'ACTIF',
        candidatureId: candidature.id,
        donneesContrat
      }
    });

    contratCount++;

    //  Associer un User EMPLOYE réel (même pattern que seed-evaluations-pe)
    // candidat.accepte1 → employesPharma[0], candidat.accepte2 → employesSI[0]
    const employe = i === 0
      ? employesPharma[0]
      : employesSI[0];

    const manager = i === 0 ? managerPharma : managerSI;

    const evalReference = `EVAL-${now.getFullYear()}-${String(evalCount + 1).padStart(4, '0')}`;

    //  Créer l'évaluation PE avec un User EMPLOYE valide
    const evaluation = await prisma.evaluationPE.create({
      data: {
        reference: evalReference,
        employeId: employe.id,   //  vrai User.id → FK respectée
        managerId: manager.id,
        contratId: contrat.id,
        dateDebut,
        dateFin,
        joursRestants,
        statut: 'BROUILLON',
        etapeActuelle: 0,
        totalEtapes: 3
      }
    });

    evalCount++;

    console.log(`    Contrat  : ${contrat.reference} — ${candidature.prenom} ${candidature.nom} (ACTIF)`);
    console.log(`      Employé  : ${employe.prenom} ${employe.nom} (User réel)`);
    console.log(`      Manager  : ${manager.prenom} ${manager.nom}`);
    console.log(`      Eval     : ${evaluation.reference} — BROUILLON — J-${joursRestants}`);
    console.log('');
  }

  console.log(`=== RÉSUMÉ ===`);
  console.log(`Contrats créés    : ${contratCount}`);
  console.log(`Évaluations créées: ${evalCount}`);
  console.log(`dateFin PE        : ${dateFin.toLocaleDateString('fr-FR')} (J-${joursRestants})`);
  console.log(`\n Les évaluations sont visibles dans "Données PE"`);
}

main()
  .catch(e => { console.error('Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());