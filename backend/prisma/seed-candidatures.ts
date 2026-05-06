// backend/prisma/seed-candidatures.ts


import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
// Interface pour les candidats

interface CandidatSeed {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  cvTexte: string;
  statut: string;
  scoreGlobal: number;
  scoreExp: number;
  competencesDetectees: string[];
  competencesManquantes: string[];
  consentementRGPD: boolean;
  consentementIA: boolean;
  offreCible: string | null;
}

const CANDIDATS: CandidatSeed[] = [
  // CANDIDATS ACTIFS
  {
    nom: 'Ben Salah',
    prenom: 'Amira',
    email: 'amira.bensalah@example.com',
    telephone: '+216 50 111 111',
    cvTexte: `Pharmacienne industrielle avec 5 ans d'experience en assurance qualite.`,
    statut: 'NOUVELLE',
    scoreGlobal: 85,
    scoreExp: 80,
    competencesDetectees: ['BPF', 'Audit qualite', 'Gestion des risques'],
    competencesManquantes: ['Affaires reglementaires'],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur Commercial'
  },
  {
    nom: 'Mbarek',
    prenom: 'Fathi',
    email: 'fathi.mbarek@example.com',
    telephone: '+216 50 222 222',
    cvTexte: `Chef de produit pharmaceutique avec 6 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 92,
    scoreExp: 88,
    competencesDetectees: ['Marketing strategique', 'Lancement produit'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur Commercial'
  },
  {
    nom: 'Marzouk',
    prenom: 'Leila',
    email: 'leila.marzouk@example.com',
    telephone: '+216 50 999 999',
    cvTexte: `Responsable R&D avec 8 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 91,
    scoreExp: 88,
    competencesDetectees: ['R&D', 'Innovation', 'Management strategique'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur General Adjoint'
  },
  {
    nom: 'Karray',
    prenom: 'Slim',
    email: 'slim.karray@example.com',
    telephone: '+216 50 151 515',
    cvTexte: `Directeur marketing avec 8 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 89,
    scoreExp: 87,
    competencesDetectees: ['Marketing strategique', 'Brand management', 'Digital marketing'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur General Adjoint'
  },
  {
    nom: 'Alternatif',
    prenom: 'Profil',
    email: 'profil.alternatif@example.com',
    telephone: '+216 50 131 313',
    cvTexte: `Commercial senior avec 10 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 86,
    scoreExp: 84,
    competencesDetectees: ['Negociation', 'Force de vente', 'CRM'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null
  },
  {
    nom: 'Nouveau',
    prenom: 'Candidate',
    email: 'candidate.sansoffre@example.com',
    telephone: '+216 50 121 212',
    cvTexte: `Expert en IA avec 7 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 94,
    scoreExp: 92,
    competencesDetectees: ['Python', 'TensorFlow', 'PyTorch'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null
  },
  {
    nom: 'Gharbi',
    prenom: 'Karim',
    email: 'karim.gharbi@example.com',
    telephone: '+216 50 666 666',
    cvTexte: `DevOps Engineer avec 6 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 95,
    scoreExp: 90,
    competencesDetectees: ['Docker', 'Kubernetes', 'CI/CD'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null
  },
  {
    nom: 'Boukadida',
    prenom: 'Sonia',
    email: 'sonia.boukadida@example.com',
    telephone: '+216 50 555 555',
    cvTexte: `Data Engineer avec 5 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 88,
    scoreExp: 85,
    competencesDetectees: ['Python', 'SQL', 'Spark'],
    competencesManquantes: ['Kubernetes'],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null
  },
  {
    nom: 'Mansour',
    prenom: 'Leila',
    email: 'leila.mansour@example.com',
    telephone: '+216 50 777 777',
    cvTexte: `Responsable marketing digital avec 4 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 75,
    scoreExp: 70,
    competencesDetectees: ['SEO', 'Google Analytics', 'Social Media'],
    competencesManquantes: ['CRM'],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null
  },
  {
    nom: 'Haddad',
    prenom: 'Mehdi',
    email: 'mehdi.haddad@example.com',
    telephone: '+216 50 141 414',
    cvTexte: `Responsable RH avec 6 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 82,
    scoreExp: 80,
    competencesDetectees: ['Recrutement', 'Paie', 'SIRH'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null
  },
  {
    nom: 'Ben Ali',
    prenom: 'Rami',
    email: 'rami.benali@example.com',
    telephone: '+216 50 101 010',
    cvTexte: `Controleur de gestion avec 5 ans d'experience.`,
    statut: 'NOUVELLE',
    scoreGlobal: 82,
    scoreExp: 78,
    competencesDetectees: ['Comptabilite analytique', 'Budget', 'Reporting'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null
  },
  {
    nom: 'Test',
    prenom: 'SansContrat',
    email: 'candidat.sanscontrat@kilani.tn',
    telephone: '+216 50 999 003',
    cvTexte: `Candidat accepte sans contrat pour tester la generation.`,
    statut: 'ACCEPTEE',
    scoreGlobal: 85,
    scoreExp: 80,
    competencesDetectees: ['Test', 'Qualite'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur Commercial'
  },
  {
    nom: 'Accepte',
    prenom: 'Candidat1',
    email: 'candidat.accepte1@kilani.tn',
    telephone: '+216 50 999 001',
    cvTexte: `Candidat accepte pour test contrat.`,
    statut: 'ACCEPTEE',
    scoreGlobal: 90,
    scoreExp: 85,
    competencesDetectees: ['Management', 'Leadership'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur Commercial'
  },
  {
    nom: 'Accepte',
    prenom: 'Candidat2',
    email: 'candidat.accepte2@kilani.tn',
    telephone: '+216 50 999 002',
    cvTexte: `Candidat accepte pour test contrat.`,
    statut: 'ACCEPTEE',
    scoreGlobal: 88,
    scoreExp: 82,
    competencesDetectees: ['Finance', 'Comptabilite'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur General Adjoint'
  }
];

const getOffreByIntitule = async (intitule: string) => {
  return prisma.offreEmploi.findFirst({
    where: { intitule: { contains: intitule, mode: 'insensitive' }, statut: 'PUBLIEE' }
  });
};

const generateReference = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.candidature.count({ where: { reference: { startsWith: `CAND-${year}` } } });
  return `CAND-${year}-${String(count + 1).padStart(4, '0')}`;
};

async function main() {
  console.log('Debut du seed des candidatures...');
  await prisma.$connect();
  console.log('Connecte a la base de donnees');

  const offresPubliees = await prisma.offreEmploi.findMany({ where: { statut: 'PUBLIEE' } });
  console.log('\n=== OFFRES DISPONIBLES ===');
  for (const offre of offresPubliees) {
    console.log(`   - ${offre.reference} : ${offre.intitule}`);
  }

  const deleted = await prisma.candidature.deleteMany({});
  console.log(`\nSuppression de ${deleted.count} anciennes candidatures`);
  
  console.log('\n=== CREATION DES CANDIDATURES ===');

  let createdCount = 0;
  let candidatsActifs = 0;
  let candidatsPassifs = 0;
  let consentementIA = 0;

  for (const candidat of CANDIDATS) {
    let offreId = undefined;
    let offreTrouvee = null;
    
    if (candidat.offreCible) {
      offreTrouvee = await getOffreByIntitule(candidat.offreCible);
      if (offreTrouvee) {
        offreId = offreTrouvee.id;
        candidatsActifs++;
        console.log(`   ACTIF: ${candidat.prenom} ${candidat.nom} -> ${offreTrouvee.intitule} (${candidat.statut})`);
      } else {
        console.log(`   ${candidat.prenom} ${candidat.nom} -> Offre non trouvee: ${candidat.offreCible} (devient passif)`);
        candidatsPassifs++;
      }
    } else {
      candidatsPassifs++;
      console.log(`   PASSIF: ${candidat.prenom} ${candidat.nom} (sans offre - matching inverse)`);
    }

    if (candidat.consentementIA) consentementIA++;

    await prisma.candidature.create({
      data: {
        reference: await generateReference(),
        nom: candidat.nom,
        prenom: candidat.prenom,
        email: candidat.email,
        telephone: candidat.telephone,
        cvUrl: `/uploads/cv/${candidat.nom.toLowerCase()}_${candidat.prenom.toLowerCase()}.pdf`,
        cvTexte: candidat.cvTexte,
        scoreGlobal: candidat.scoreGlobal,
        scoreExp: candidat.scoreExp,
        competencesDetectees: candidat.competencesDetectees,
        competencesManquantes: candidat.competencesManquantes,
        statut: candidat.statut,
        consentementRGPD: candidat.consentementRGPD,
        consentementIA: candidat.consentementIA,
        dateSoumission: new Date(),
        offreId: offreId
      }
    });
    createdCount++;
  }

  console.log(`\n=== STATISTIQUES ===`);
  console.log(`Total candidatures: ${createdCount}`);
  console.log(`   Actifs: ${candidatsActifs}`);
  console.log(`   Passifs: ${candidatsPassifs}`);
  console.log(`   Consentement IA: ${consentementIA}/${createdCount}`);
  
  console.log('\nSeed des candidatures termine !');
}

main()
  .catch(e => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });