// backend/src/scripts/auditCoherence.ts
//
// Script d'audit en LECTURE SEULE. Ne modifie rien en base.
// Usage : npx ts-node src/scripts/auditCoherence.ts
// (ou via un script npm : "audit": "ts-node src/scripts/auditCoherence.ts")

import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';

const NIVEAUX_AVEC_DIRECTION = ['CADRE_SUPERIEUR', 'STRATEGIQUE'];

let totalAnomalies = 0;

function log(titre: string) {
  console.log(`\n${'='.repeat(60)}\n${titre}\n${'='.repeat(60)}`);
}

function anomalie(msg: string) {
  totalAnomalies++;
  console.log(`  [ANOMALIE] ${msg}`);
}

function ok(msg: string) {
  console.log(`  [OK] ${msg}`);
}

async function auditEntretiens() {
  log('ENTRETIENS');
  const maintenant = new Date();

  const entretiensPasses = await prisma.entretien.findMany({
    where: { statut: 'PLANIFIE', date: { lt: maintenant } },
    include: { candidature: { select: { nom: true, prenom: true, reference: true } } }
  });
  if (entretiensPasses.length === 0) {
    ok('Aucun entretien PLANIFIE avec une date passee');
  } else {
    entretiensPasses.forEach(e => {
      anomalie(`Entretien ${e.id} (${e.type}) toujours PLANIFIE alors que sa date (${e.date.toLocaleDateString('fr-FR')}) est passee — candidat ${e.candidature.prenom} ${e.candidature.nom} (${e.candidature.reference})`);
    });
  }

  const entretiensSansFeedback = await prisma.entretien.findMany({
    where: { statut: 'REALISE', feedback: null },
    include: { candidature: { select: { nom: true, prenom: true, reference: true } } }
  });
  if (entretiensSansFeedback.length === 0) {
    ok('Aucun entretien REALISE sans feedback');
  } else {
    entretiensSansFeedback.forEach(e => {
      anomalie(`Entretien ${e.id} marque REALISE mais sans feedback — candidat ${e.candidature.prenom} ${e.candidature.nom}`);
    });
  }

  const entretiensDirection = await prisma.entretien.findMany({
    where: { type: 'DIRECTION' },
    include: {
      candidature: {
        include: { offre: { include: { demande: { select: { niveau: true } } } } }
      }
    }
  });
  entretiensDirection.forEach(e => {
    const niveau = e.candidature.offre?.demande?.niveau;
    if (!niveau || !NIVEAUX_AVEC_DIRECTION.includes(niveau)) {
      anomalie(`Entretien DIRECTION ${e.id} cree pour un poste de niveau "${niveau}" (non eligible) — candidature ${e.candidatureId}`);
    }
  });
  if (entretiensDirection.every(e => NIVEAUX_AVEC_DIRECTION.includes(e.candidature.offre?.demande?.niveau || ''))) {
    ok('Tous les entretiens DIRECTION correspondent a un poste eligible');
  }

  const entretiensAvecDispo = await prisma.entretien.findMany({
    where: { disponibiliteId: { not: null } },
    include: { disponibilite: true }
  });
  entretiensAvecDispo.forEach(e => {
    if (e.disponibilite && !e.disponibilite.reservee) {
      anomalie(`Entretien ${e.id} lie a la disponibilite ${e.disponibiliteId}, mais celle-ci est marquee reservee=false`);
    }
  });
}

async function auditDisponibilites() {
  log('DISPONIBILITES INTERVIEWERS');
  const maintenant = new Date();

  const creneauxPerimes = await prisma.disponibiliteInterviewer.findMany({
    where: { reservee: false, date: { lt: maintenant } },
    include: { user: { select: { nom: true, prenom: true, role: true } } }
  });
  if (creneauxPerimes.length === 0) {
    ok('Aucun creneau perime (non reserve avec date passee)');
  } else {
    creneauxPerimes.forEach(d => {
      anomalie(`Creneau ${d.id} du ${d.date.toLocaleDateString('fr-FR')} (${d.heureDebut}-${d.heureFin}) chez ${d.user.prenom} ${d.user.nom} (${d.user.role}) est perime et jamais reserve — toujours propose aux candidats`);
    });
  }

  const dispoReservees = await prisma.disponibiliteInterviewer.findMany({
    where: { reservee: true },
    include: { entretien: true }
  });
  dispoReservees.forEach(d => {
    if (!d.entretien) {
      anomalie(`Creneau ${d.id} marque reservee=true mais aucun entretien ne lui est lie — reservation fantome, bloque le creneau inutilement`);
    }
  });
}

async function auditCandidatures() {
  log('CANDIDATURES');

  const candidaturesEntretienSansEntretien = await prisma.candidature.findMany({
    where: { statut: 'ENTRETIEN' },
    include: { entretiens: true }
  });
  candidaturesEntretienSansEntretien.forEach(c => {
    if (c.entretiens.length === 0) {
      anomalie(`Candidature ${c.reference} (${c.prenom} ${c.nom}) au statut ENTRETIEN mais aucun entretien enregistre`);
    }
  });

  const fichesRecuesStatutIncoherent = await prisma.candidature.findMany({
    where: { ficheRenseignementRecue: true, statut: 'FICHE_ENVOYEE' }
  });
  if (fichesRecuesStatutIncoherent.length === 0) {
    ok('Aucune candidature avec fiche recue mais statut reste sur FICHE_ENVOYEE');
  } else {
    fichesRecuesStatutIncoherent.forEach(c => {
      anomalie(`Candidature ${c.reference} : fiche recue le ${c.ficheRenseignementRecueAt?.toLocaleDateString('fr-FR')} mais statut toujours FICHE_ENVOYEE`);
    });
  }

  const ficheEnvoyeeSansDate = await prisma.candidature.findMany({
    where: { statut: 'FICHE_ENVOYEE', ficheRenseignementEnvoyeeAt: null }
  });
  if (ficheEnvoyeeSansDate.length === 0) {
    ok('Toutes les candidatures FICHE_ENVOYEE ont bien une date d\'envoi');
  } else {
    ficheEnvoyeeSansDate.forEach(c => {
      anomalie(`Candidature ${c.reference} au statut FICHE_ENVOYEE sans ficheRenseignementEnvoyeeAt — le job 48h ne la detectera jamais`);
    });
  }

  const accepteesSansContrat = await prisma.candidature.findMany({
    where: { statut: 'ACCEPTEE' },
    include: { contrat: true }
  });
  accepteesSansContrat.forEach(c => {
    if (!c.contrat) {
      anomalie(`Candidature ${c.reference} (${c.prenom} ${c.nom}) ACCEPTEE mais aucun contrat cree`);
    }
  });

  const refusAuto = await prisma.auditLog.findMany({
    where: { action: 'REFUS_AUTO_48H_FICHE_NON_RECUE' },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log(`  [INFO] ${refusAuto.length} refus automatique(s) (48h) enregistre(s) dans l'historique recent`);
}

async function auditValidationsEtRelances() {
  log('VALIDATIONS DE DEMANDES ET RELANCES');
  const maintenant = new Date();

  const validationsEnRetardNonRelancees = await prisma.validationEtape.findMany({
    where: { decision: 'EN_ATTENTE', dateLimite: { lt: maintenant }, relanceEnvoyee: false },
    include: { demande: { select: { reference: true } }, acteur: { select: { nom: true, prenom: true, email: true } } }
  });
  if (validationsEnRetardNonRelancees.length === 0) {
    ok('Aucune validation en retard non relancee (le cron horaire semble fonctionner)');
  } else {
    validationsEnRetardNonRelancees.forEach(v => {
      anomalie(`Validation ${v.id} (demande ${v.demande.reference}) en retard depuis ${v.dateLimite.toLocaleDateString('fr-FR')}, relanceEnvoyee=false — le cron n'est peut-etre pas passe recemment`);
    });
  }

  const jobsBloques = await prisma.relanceJob.findMany({
    where: { executee: false, datePrevue: { lt: new Date(maintenant.getTime() - 48 * 60 * 60 * 1000) } }
  });
  if (jobsBloques.length === 0) {
    ok('Aucun RelanceJob bloque depuis plus de 48h');
  } else {
    jobsBloques.forEach(j => {
      anomalie(`RelanceJob ${j.id} (type ${j.type}) prevu le ${j.datePrevue.toLocaleDateString('fr-FR')} et toujours non execute`);
    });
  }

  const demandesValideesSansOffre = await prisma.demandeRecrutement.findMany({
    where: { statut: 'VALIDEE' },
    include: { offre: true }
  });
  demandesValideesSansOffre.forEach(d => {
    if (!d.offre) {
      anomalie(`Demande ${d.reference} VALIDEE mais aucune offre generee`);
    }
  });

  const demandesSansTotalEtapes = await prisma.demandeRecrutement.findMany({
    where: { totalEtapes: null, statut: { notIn: ['BROUILLON', 'ANNULEE'] } }
  });
  if (demandesSansTotalEtapes.length === 0) {
    ok('Toutes les demandes actives ont un totalEtapes defini');
  } else {
    demandesSansTotalEtapes.forEach(d => {
      anomalie(`Demande ${d.reference} (statut ${d.statut}) a totalEtapes=null — depend du fallback circuitConfig dans le service de relance`);
    });
  }
}

async function auditContrats() {
  log('CONTRATS');

  const contratsDatesIncoherentes = await prisma.contrat.findMany({
    where: { dateFin: { not: null } }
  });
  contratsDatesIncoherentes.forEach(c => {
    if (c.dateFin && c.dateFin < c.dateDebut) {
      anomalie(`Contrat ${c.reference} : dateFin (${c.dateFin.toLocaleDateString('fr-FR')}) anterieure a dateDebut (${c.dateDebut.toLocaleDateString('fr-FR')})`);
    }
  });

  const contratsActifs = await prisma.contrat.findMany({
    where: { statut: 'ACTIF' },
    include: { candidature: { select: { statut: true, reference: true } } }
  });
  contratsActifs.forEach(c => {
    if (c.candidature && c.candidature.statut !== 'ACCEPTEE') {
      anomalie(`Contrat ${c.reference} ACTIF mais candidature liee (${c.candidature.reference}) a le statut ${c.candidature.statut}`);
    }
  });
}

async function main() {
  console.log('AUDIT DE COHERENCE — Plateforme RH Kilani');
  console.log(`Date d'execution : ${new Date().toLocaleString('fr-FR')}`);

  await auditEntretiens();
  await auditDisponibilites();
  await auditCandidatures();
  await auditValidationsEtRelances();
  await auditContrats();

  console.log(`\n${'='.repeat(60)}`);
  if (totalAnomalies === 0) {
    console.log('AUCUNE ANOMALIE DETECTEE');
  } else {
    console.log(`${totalAnomalies} ANOMALIE(S) DETECTEE(S) — voir le detail ci-dessus`);
  }
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Erreur pendant l\'audit:', error);
  await prisma.$disconnect();
  process.exit(1);
});