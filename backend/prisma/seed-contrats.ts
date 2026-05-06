// backend/prisma/seed-contrats.ts
// ✅ Stocke les données complètes dans donneesContrat pour que le PDF soit auto-rempli

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import process from 'process';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seed des contrats...');
  await prisma.$connect();

  console.log('Nettoyage des données existantes...');
  await prisma.evaluationValidation.deleteMany({});
  await prisma.evaluationPE.deleteMany({});
  await prisma.avenant.deleteMany({});
  await prisma.contrat.deleteMany({});
  console.log('   Anciennes données supprimées');

  const candidaturesAcceptees = await prisma.candidature.findMany({
    where: { statut: 'ACCEPTEE' },
    include: {
      offre: {
        include: {
          demande: { include: { direction: true } }
        }
      }
    }
  });

  console.log(`\nCandidatures acceptées trouvées: ${candidaturesAcceptees.length}`);
  if (candidaturesAcceptees.length === 0) {
    console.log('⚠️ Aucune candidature acceptée');
    return;
  }

  const now = new Date();
  let contratCount = 0;
  const emailsASauter = ['candidat.sanscontrat@kilani.tn'];

  for (const candidature of candidaturesAcceptees) {
    if (emailsASauter.includes(candidature.email)) {
      console.log(`   ⚠️ Candidat ${candidature.email} ignoré`);
      continue;
    }

    const existingContrat = await prisma.contrat.findFirst({
      where: { candidatureId: candidature.id }
    });
    if (existingContrat) continue;

    const dateDebut = now;
    const dateFinPeriodeEssai = new Date(dateDebut);
    dateFinPeriodeEssai.setMonth(dateFinPeriodeEssai.getMonth() + 3);

    const typeContrat = candidature.offre?.typeContrat || 'CDI';
    const salaire = candidature.offre?.demande?.budgetMax
      ? `${candidature.offre.demande.budgetMax} DT`
      : '3000 DT';

    // ✅ Récupérer la fiche de renseignement
    const ficheData = (candidature.ficheRenseignementData as Record<string, any>) || {};

    // ✅ Construire donneesContrat complet (même structure que createContrat)
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
        direction: candidature.offre?.demande?.direction?.nom || '',
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

    const contrat = await prisma.contrat.create({
      data: {
        reference: `CTR-${now.getFullYear()}-${String(contratCount + 1).padStart(4, '0')}`,
        typeContrat: typeContrat as any,
        salaire,
        dateDebut,
        dateFin: dateFinPeriodeEssai,
        statut: 'BROUILLON',
        candidatureId: candidature.id,
        donneesContrat  // ✅ données complètes sauvegardées
      }
    });

    console.log(`   ✅ ${contrat.reference} — ${candidature.prenom} ${candidature.nom} — ${typeContrat} — ${salaire}`);
    contratCount++;
  }

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`Contrats créés: ${contratCount}`);
  console.log(`Total: ${await prisma.contrat.count()}`);
  console.log(`\n✅ Seed terminé !`);
}

main()
  .catch(e => { console.error('Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());