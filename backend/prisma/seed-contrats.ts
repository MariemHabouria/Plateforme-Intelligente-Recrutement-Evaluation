// backend/prisma/seed-contrats.ts
//
// Corrections apportées par rapport à la version précédente :
//
//   1. FIX FLUX : l'ancienne version reliait chaque contrat à un User déjà
//      existant (employesPharma[0]/employesSI[0], créés à part par
//      seed-employes.ts) et créait l'EvaluationPE directement en base
//      avec des données fabriquées à la main. Cela n'exerce AUCUN chemin
//      réellement emprunté par l'application : en production, (a) la
//      fiche EMPLOYE n'existe QUE parce qu'un contrat vient d'être signé
//      (signerContrat -> creerFicheEmployeDepuisContrat), et (b)
//      l'EvaluationPE n'est créée QUE par le job J-30
//      (evaluationPEService.verifierContratsEcheance), jamais à la main.
//
//      FIX : ce script fait maintenant transiter de VRAIS candidats
//      acceptés par le VRAI cycle de vie :
//        Candidature (ACCEPTEE) -> Contrat (signature simulée -> ACTIF)
//          -> fiche employé créée avec la même logique que
//             creerFicheEmployeDepuisContrat
//          -> appel réel de evaluationPEService.verifierContratsEcheance()
//             pour déclencher l'EvaluationPE exactement comme le ferait
//             le cron J-30 en production.
//
//   2. FIX MÉTIER (précision de Mariem) : un EMPLOYE n'a PAS accès à la
//      plateforme (seuls SUPER_ADMIN, MANAGER, DIRECTEUR, DRH, DAF, DGA,
//      DG, RESP_PAIE s'y connectent). La fiche employé auto-créée reçoit
//      donc une valeur aléatoire dans `password` (contrainte NOT NULL du
//      schéma), jamais affichée ni communiquée — ce n'est pas un compte.
//
//   3. FIX : génération de `reference` contrat protégée contre les
//      collisions concurrentes, comme dans contratController.ts.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import 'dotenv/config';
import process from 'process';
import { evaluationPEService } from '../src/services/evaluationPE.service';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Valeur aléatoire pour `password` — jamais utilisée ni communiquée :
// l'EMPLOYE n'a pas accès à la plateforme (voir contratController.ts).
const genererValeurPlaceholder = (): string => {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'Aa1!';
};

const genererReferenceContrat = async (): Promise<string> => {
  const year = new Date().getFullYear();
  for (let tentative = 0; tentative < 5; tentative++) {
    const count = await prisma.contrat.count({ where: { reference: { startsWith: `CTR-${year}` } } });
    const suffixe = tentative === 0 ? '' : `-${Date.now().toString().slice(-4)}`;
    const reference = `CTR-${year}-${String(count + 1 + tentative).padStart(4, '0')}${suffixe}`;
    const existe = await prisma.contrat.findUnique({ where: { reference } });
    if (!existe) return reference;
  }
  return `CTR-${year}-${Date.now()}`;
};

async function main() {
  console.log('Seed des contrats (flux réel : candidature -> signature -> fiche -> J-30)...');
  await prisma.$connect();

  console.log('\nNettoyage...');
  await prisma.evaluationValidation.deleteMany({});
  await prisma.evaluationPE.deleteMany({});
  await prisma.avenant.deleteMany({});
  await prisma.contrat.deleteMany({});
  console.log('   Done');

  const candidaturesAcceptees = await prisma.candidature.findMany({
    where: {
      statut: 'ACCEPTEE',
      email: { notIn: ['candidat.sanscontrat@kilani.tn'] }
    },
    include: {
      offre: { include: { demande: { include: { direction: true } } } }
    }
  });

  console.log(`\nCandidatures acceptées (hors ignorées) : ${candidaturesAcceptees.length}`);
  if (candidaturesAcceptees.length === 0) {
    console.log(' Aucune candidature acceptée — lance seed-candidatures.ts d\'abord');
    return;
  }

  const now = new Date();
  // Dates pour simuler une PE en cours à J-20 (dans la fenêtre J-30 du job)
  const dateDebut = new Date(now);
  dateDebut.setDate(dateDebut.getDate() - 70);
  const dateFin = new Date(now);
  dateFin.setDate(dateFin.getDate() + 20);

  let contratCount = 0;
  let fichesCreees = 0;

  console.log('\n=== CRÉATION DES CONTRATS (signature simulée) ===\n');

  for (const candidature of candidaturesAcceptees) {
    const existingContrat = await prisma.contrat.findFirst({ where: { candidatureId: candidature.id } });
    if (existingContrat) {
      console.log(`     Contrat déjà existant pour ${candidature.email}`);
      continue;
    }

    const typeContrat = candidature.offre?.typeContrat || 'CDI';
    const salaire = candidature.offre?.demande?.budgetMax
      ? `${candidature.offre.demande.budgetMax} DT`
      : '3000 DT';

    const ficheData = (candidature.ficheRenseignementData as Record<string, any>) || {};
    const directionNom = candidature.offre?.demande?.direction?.nom || '';
    const directionId = candidature.offre?.demande?.directionId;

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

    // Contrat créé directement à l'état ACTIF pour simuler une signature
    // déjà effectuée (le cycle BROUILLON -> ENVOYE -> ACTIF se teste déjà
    // via l'API/le frontend ; ce qu'on veut reproduire fidèlement ici,
    // c'est ce qui se passe APRÈS la signature).
    const reference = await genererReferenceContrat();
    const contrat = await prisma.contrat.create({
      data: {
        reference,
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

    // FIX : la fiche employé est créée ici avec exactement la même
    // logique que creerFicheEmployeDepuisContrat (contratController.ts).
    // Ce n'est PAS un compte : password reçoit une valeur aléatoire
    // jamais affichée ni communiquée, l'EMPLOYE n'ayant pas accès à la
    // plateforme. Avant, ce script réutilisait des
    // employesPharma[0]/employesSI[0] créés à part par seed-employes.ts,
    // sans aucun rapport avec CE candidat/contrat précis.
    let employe = await prisma.user.findFirst({ where: { email: candidature.email, role: 'EMPLOYE' } });
    if (!employe) {
      const passwordHash = await bcrypt.hash(genererValeurPlaceholder(), 10);

      employe = await prisma.user.create({
        data: {
          email: candidature.email,
          password: passwordHash,
          nom: candidature.nom,
          prenom: candidature.prenom,
          role: 'EMPLOYE',
          poste: donneesContrat.poste.intitule || 'Employé',
          telephone: candidature.telephone,
          directionId: directionId || null,
          dateArrivee: dateDebut,
          actif: true,
          mustChangePassword: true
        }
      });

      fichesCreees++;
    }

    console.log(`    Contrat  : ${contrat.reference} — ${candidature.prenom} ${candidature.nom} (ACTIF)`);
    console.log(`      Fiche employé : ${employe.prenom} ${employe.nom} — sans accès plateforme`);
    console.log('');
  }

  console.log(`=== RÉSUMÉ CONTRATS ===`);
  console.log(`Contrats créés     : ${contratCount}`);
  console.log(`Fiches employé créées : ${fichesCreees}`);
  console.log(`dateFin PE         : ${dateFin.toLocaleDateString('fr-FR')} (J-20, dans la fenêtre J-30)`);

  // FIX PRINCIPAL : on ne fabrique plus l'EvaluationPE à la main. On
  // appelle le VRAI job J-30 (celui déclenché par le cron/l'endpoint
  // POST /evaluations/declencher) pour qu'il détecte ces contrats ACTIFs
  // proches de l'échéance, retrouve la fiche employé par email de
  // candidature, retrouve le manager par direction, génère la vraie
  // référence d'évaluation, et envoie les vraies notifications. C'est
  // exactement le flux qu'on veut pouvoir observer de bout en bout.
  console.log('\n=== DÉCLENCHEMENT DU JOB J-30 (flux réel) ===\n');
  const nbEvaluationsCreees = await evaluationPEService.verifierContratsEcheance();
  console.log(`\n${nbEvaluationsCreees} évaluation(s) PE créée(s) via le vrai flux J-30.`);
  console.log('Elles sont visibles dans "Données PE", à l\'étape Resp. Paie (BROUILLON).');
  console.log('Le circuit Resp. Paie -> Manager -> Directeur peut ensuite être testé via l\'API/le frontend.');

  // NOTE : si vous avez également un seed-evaluations-pe.ts qui insère des
  // EvaluationPE à la main, il fera doublon (voire échouera sur la
  // contrainte unique EvaluationPE.contratId) avec ce que verifierContratsEcheance()
  // vient de créer ici. Il est probablement à supprimer ou à limiter à des
  // scénarios que le job J-30 ne peut pas couvrir (ex. avancer une
  // évaluation à une étape ultérieure du circuit pour tester le frontend
  // sans repasser par toutes les étapes manuellement).
}

main()
  .catch(e => { console.error('Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());