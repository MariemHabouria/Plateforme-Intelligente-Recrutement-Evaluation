// backend/prisma/seed-employes.ts
//
// Corrections apportées par rapport à la version précédente :
//
//   PROBLÈME 1 : ce script créait des User (role EMPLOYE) sans aucun
//   Contrat associé. Or dans l'application réelle, une fiche EMPLOYE
//   n'est jamais créée "abstraitement" : elle est le sous-produit de la
//   signature d'un contrat (contratController.ts -> signerContrat ->
//   creerFicheEmployeDepuisContrat). Sans contrat, l'employé est
//   invisible pour le job J-30 (evaluationPEService.verifierContratsEcheance),
//   qui ne travaille qu'à partir de Contrats ACTIFs.
//
//   PROBLÈME 2 (précision de Mariem) : un EMPLOYE n'a de toute façon PAS
//   accès à la plateforme — seuls SUPER_ADMIN, MANAGER, DIRECTEUR, DRH,
//   DAF, DGA, DG et RESP_PAIE s'y connectent. La version précédente
//   donnait donc un mot de passe "de test" ('employe123') comme si
//   l'employé allait se connecter avec — ce qui ne correspond à rien de
//   réel. Ce n'est pas un compte, c'est une fiche RH : le champ `password`
//   reste NOT NULL en base (contrainte du schéma), mais sa valeur n'est
//   ni signifiante ni destinée à être utilisée ou communiquée.
//
//   FIX : ce script sert désormais uniquement aux employés "historiques"
//   (arrivés avant la plateforme, sans candidature à rattacher). Pour
//   chacun :
//     1. On crée D'ABORD un Contrat ACTIF (candidatureId: null — le
//        schéma l'autorise explicitement).
//     2. On crée ENSUITE la fiche employé (User, role EMPLOYE), avec une
//        valeur aléatoire dans `password` qu'on n'affiche ni ne
//        transmet nulle part (elle ne sert jamais).
//
//   NOTE : ces employés historiques n'ayant pas de candidature liée, ils
//   ne peuvent pas obtenir d'évaluation PE générée automatiquement par le
//   job J-30 (celui-ci ne sait retrouver la fiche qu'à partir de
//   candidature.email/nom/prenom). C'est attendu, pas un bug. Pour voir
//   le circuit complet d'évaluation (Resp. Paie -> Manager -> Directeur)
//   de bout en bout, lancez seed-contrats.ts : il fait passer de vrais
//   candidats par tout le cycle réel (candidature -> contrat -> signature
//   -> fiche employé -> déclenchement J-30 réel).

import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// Valeur aléatoire pour le champ `password` (NOT NULL en base) — jamais
// utilisée ni communiquée : l'EMPLOYE n'a pas accès à la plateforme.
function genererValeurPlaceholder(): string {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'Aa1!';
}

async function main() {
  console.log('Debut du seed des fiches employes historiques (sans candidature)...');
  await prisma.$connect();

  const directionPharma = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_PHARMA' } });
  const directionSI     = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_SI' } });
  const directionMKT    = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_MKT' } });

  const managerPharma = await prisma.user.findFirstOrThrow({ where: { email: 'manager.pharma@kilani.tn' } });
  const managerSI     = await prisma.user.findFirstOrThrow({ where: { email: 'manager.si@kilani.tn' } });
  const managerMKT    = await prisma.user.findFirstOrThrow({ where: { email: 'manager.mkt@kilani.tn' } });

  const now = new Date();
  // Contrat déjà ancien et actif de longue date, loin de toute échéance
  // J-30 : ces fiches "historiques" ne doivent pas polluer le job
  // d'évaluation avec de faux positifs.
  const dateDebutAncienne = new Date(now);
  dateDebutAncienne.setFullYear(dateDebutAncienne.getFullYear() - 2);
  const dateFinPEAncienne = new Date(dateDebutAncienne);
  dateFinPEAncienne.setMonth(dateFinPEAncienne.getMonth() + 3);

  const employes = [
    { email: 'employe1.pharma@kilani.tn', nom: 'Trabelsi', prenom: 'Fathi', poste: 'Technicien de laboratoire', directionId: directionPharma.id, managerId: managerPharma.id, salaire: '1800 DT' },
    { email: 'employe2.pharma@kilani.tn', nom: 'Bouzid', prenom: 'Amira', poste: 'Pharmacien AQ', directionId: directionPharma.id, managerId: managerPharma.id, salaire: '2200 DT' },
    { email: 'employe1.si@kilani.tn', nom: 'Gharbi', prenom: 'Karim', poste: 'Developpeur Full Stack', directionId: directionSI.id, managerId: managerSI.id, salaire: '2500 DT' },
    { email: 'employe2.si@kilani.tn', nom: 'Boukadida', prenom: 'Sonia', poste: 'Developpeuse Full Stack', directionId: directionSI.id, managerId: managerSI.id, salaire: '2500 DT' },
    { email: 'employe1.mkt@kilani.tn', nom: 'Hamdi', prenom: 'Ines', poste: 'Community Manager', directionId: directionMKT.id, managerId: managerMKT.id, salaire: '1900 DT' },
    { email: 'employe2.mkt@kilani.tn', nom: 'Mansour', prenom: 'Youssef', poste: 'Chef de Produit Marketing', directionId: directionMKT.id, managerId: managerMKT.id, salaire: '2100 DT' },
  ];

  console.log('\nCreation des contrats + fiches employes historiques...');
  let ficheCount = 0;

  for (const e of employes) {
    const existingUser = await prisma.user.findUnique({ where: { email: e.email } });
    if (existingUser) {
      console.log(`   ${e.email} existe deja, ignore`);
      continue;
    }

    // 1. Le contrat d'abord (candidatureId: null -> employé historique,
    //    le schéma autorise explicitement un contrat sans candidature).
    const contrat = await prisma.contrat.create({
      data: {
        reference: `CTR-HIST-${crypto.randomBytes(4).toString('hex')}`,
        typeContrat: 'CDI',
        salaire: e.salaire,
        dateDebut: dateDebutAncienne,
        dateFin: dateFinPEAncienne,
        statut: 'ACTIF',
        donneesContrat: {
          candidat: { nom: e.nom, prenom: e.prenom, email: e.email },
          poste: { intitule: e.poste, direction: '', superieur: 'Manager direct', lieuTravail: 'Siège social - Tunis' },
          employeur: { nom: 'KILANI GROUPE', representant: 'M. Karim Kilani, Directeur Général', adresse: 'Immeuble Kilani, Centre Urbain Nord, Tunis' },
          contrat: { typeContrat: 'CDI', salaire: e.salaire }
        }
      }
    });

    // 2. La fiche employé ensuite. Ce n'est PAS un compte de connexion :
    //    `password` reçoit une valeur aléatoire jamais affichée ni
    //    utilisée, exactement comme creerFicheEmployeDepuisContrat en
    //    production.
    const passwordHash = await bcrypt.hash(genererValeurPlaceholder(), 10);

    await prisma.user.create({
      data: {
        email: e.email,
        password: passwordHash,
        nom: e.nom,
        prenom: e.prenom,
        role: Role.EMPLOYE,
        poste: e.poste,
        directionId: e.directionId,
        managerId: e.managerId,
        dateArrivee: dateDebutAncienne,
        actif: true,
        mustChangePassword: true,
      },
    });

    ficheCount++;
    console.log(`   ${e.email} (EMPLOYE - ${e.poste}) — fiche liée au contrat ${contrat.reference}, sans accès plateforme`);
  }

  console.log(`\nSeed fiches employes historiques termine : ${ficheCount} fiche(s) creee(s).`);
}

main()
  .catch(e => {
    console.error('Erreur seed-employes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });