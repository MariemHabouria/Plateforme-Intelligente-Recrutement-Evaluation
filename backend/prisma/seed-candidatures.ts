// backend/prisma/seed-candidatures.ts

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// Profils de candidats - MELANGE: candidats actifs (ont postulé) et passifs (matching inverse)
const CANDIDATS = [
  // ============================================================
  // CANDIDATS ACTIFS (ont postulé à une offre existante)
  // ============================================================
  
  // Pour offre Directeur Commercial (OFF-2026-PHARMA-474)
  {
    nom: 'Ben Salah',
    prenom: 'Amira',
    email: 'amira.bensalah@example.com',
    telephone: '+216 50 111 111',
    cvTexte: `Pharmacienne industrielle avec 5 ans d'experience en assurance qualite.
Competences: BPF, Audit qualite, Gestion des risques, Validation processus, ISO 9001, Six Sigma.
Formation: Doctorat en Pharmacie, Faculte de Pharmacie de Tunis.
Experience: Responsable Qualite chez PharmaLab (2021-2026), Technicien qualite chez PharmaPlus (2018-2021).`,
    statut: 'NOUVELLE',
    scoreGlobal: 85,
    scoreExp: 80,
    competencesDetectees: ['BPF', 'Audit qualite', 'Gestion des risques', 'Validation', 'ISO 9001', 'Six Sigma'],
    competencesManquantes: ['Affaires reglementaires', 'AMM'],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur Commercial'  // ✅ A POSTULE
  },
  {
    nom: 'Mbarek',
    prenom: 'Fathi',
    email: 'fathi.mbarek@example.com',
    telephone: '+216 50 222 222',
    cvTexte: `Chef de produit pharmaceutique avec 6 ans d'experience.
Competences: Marketing strategique, Lancement produit, Analyse marche, Gestion P&L, CRM, Trade Marketing.
Formation: Master en Marketing, IHEC Carthage.
Experience: Chef de produit chez PharmaPlus (2020-2026), Assistant chef de produit (2018-2020).`,
    statut: 'EN_COURS',
    scoreGlobal: 92,
    scoreExp: 88,
    competencesDetectees: ['Marketing strategique', 'Lancement produit', 'Analyse marche', 'Gestion P&L', 'CRM', 'Trade Marketing'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur Commercial'  // ✅ A POSTULE
  },

  // Pour offre Directeur General Adjoint (OFF-2026-PHARMA-515)
  {
    nom: 'Marzouk',
    prenom: 'Leila',
    email: 'leila.marzouk@example.com',
    telephone: '+216 50 999 999',
    cvTexte: `Responsable R&D avec 8 ans d'experience.
Competences: R&D, Innovation, Management strategique, Budget R&D, Gestion de projet, Lean Six Sigma.
Formation: Doctorat en Biotechnologie, Faculte des Sciences.
Experience: Directeur R&D chez BioTech (2018-2026), Chef de projet R&D (2014-2018).`,
    statut: 'NOUVELLE',
    scoreGlobal: 91,
    scoreExp: 88,
    competencesDetectees: ['R&D', 'Innovation', 'Management strategique', 'Budget R&D', 'Gestion de projet', 'Lean Six Sigma'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur General Adjoint'  // ✅ A POSTULE
  },
  {
    nom: 'Karray',
    prenom: 'Slim',
    email: 'slim.karray@example.com',
    telephone: '+216 50 151 515',
    cvTexte: `Directeur marketing avec 8 ans d'experience.
Competences: Marketing strategique, Brand management, Digital marketing, SEO/SEM, Analytics, Team management.
Formation: MBA, ESSEC.
Experience: Directeur Marketing chez BrandCorp (2018-2026).`,
    statut: 'EN_COURS',
    scoreGlobal: 89,
    scoreExp: 87,
    competencesDetectees: ['Marketing strategique', 'Brand management', 'Digital marketing', 'SEO', 'SEM', 'Analytics', 'Team management'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: 'Directeur General Adjoint'  // ✅ A POSTULE
  },

  // ============================================================
  // CANDIDATS PASSIFS (sans offre - pour matching inverse)
  // ============================================================
  
  // Profil commercial - pourrait matcher avec Directeur Commercial
  {
    nom: 'Alternatif',
    prenom: 'Profil',
    email: 'profil.alternatif@example.com',
    telephone: '+216 50 131 313',
    cvTexte: `Commercial senior avec 10 ans d'experience en pharmacie.
Competences: Negociation, Force de vente, Gestion de portefeuille clients, Reporting, CRM, Business Development.
Formation: Master en Commerce, IHEC.
Experience: Directeur Commercial chez PharmaDistrib (2016-2026).`,
    statut: 'NOUVELLE',
    scoreGlobal: 86,
    scoreExp: 84,
    competencesDetectees: ['Negociation', 'Force de vente', 'Gestion portefeuille', 'Reporting', 'CRM', 'Business Development'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null  // ✅ PASSIF - matching inverse
  },
  
  // Profil IA - pourrait matcher avec des offres tech
  {
    nom: 'Nouveau',
    prenom: 'Candidate',
    email: 'candidate.sansoffre@example.com',
    telephone: '+216 50 121 212',
    cvTexte: `Expert en Intelligence Artificielle et Machine Learning avec 7 ans d'experience.
Competences: Python, TensorFlow, PyTorch, Scikit-learn, NLP, Computer Vision, AWS SageMaker, MLOps.
Formation: PhD en IA, ENSI.
Experience: AI Lead chez TechCorp (2019-2026), Data Scientist (2016-2019).`,
    statut: 'NOUVELLE',
    scoreGlobal: 94,
    scoreExp: 92,
    competencesDetectees: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'NLP', 'Computer Vision', 'AWS SageMaker', 'MLOps'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null  // ✅ PASSIF - matching inverse
  },
  
  // Profil DevOps - pourrait matcher avec offres techniques
  {
    nom: 'Gharbi',
    prenom: 'Karim',
    email: 'karim.gharbi@example.com',
    telephone: '+216 50 666 666',
    cvTexte: `DevOps Engineer avec 6 ans d'experience.
Competences: Docker, Kubernetes, CI/CD, Terraform, Jenkins, Linux, AWS, Azure, GitLab CI, Prometheus.
Formation: Diplome d'Ingenieur, ENIT.
Experience: DevOps chez CloudOps (2020-2026), System Admin (2017-2020).`,
    statut: 'NOUVELLE',  // ← Remis en NOUVELLE pour matching
    scoreGlobal: 95,
    scoreExp: 90,
    competencesDetectees: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Jenkins', 'Linux', 'AWS', 'Azure', 'GitLab CI', 'Prometheus'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null  // ✅ PASSIF - matching inverse (anciennement associe a offre)
  },
  
  // Profil Data - pourrait matcher avec offres data
  {
    nom: 'Boukadida',
    prenom: 'Sonia',
    email: 'sonia.boukadida@example.com',
    telephone: '+216 50 555 555',
    cvTexte: `Data Engineer avec 5 ans d'experience.
Competences: Python, SQL, Spark, Airflow, AWS, MongoDB, Kafka, BigQuery, Looker.
Formation: Master en Data Science, ENSI.
Experience: Data Engineer chez DataCorp (2021-2026), Data Analyst (2019-2021).`,
    statut: 'NOUVELLE',  // ← Remis en NOUVELLE pour matching
    scoreGlobal: 88,
    scoreExp: 85,
    competencesDetectees: ['Python', 'SQL', 'Spark', 'Airflow', 'AWS', 'MongoDB', 'Kafka', 'BigQuery', 'Looker'],
    competencesManquantes: ['Kubernetes', 'Terraform'],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null  // ✅ PASSIF - matching inverse
  },
  
  // Profil Marketing - pourrait matcher avec offres marketing
  {
    nom: 'Mansour',
    prenom: 'Leila',
    email: 'leila.mansour@example.com',
    telephone: '+216 50 777 777',
    cvTexte: `Responsable marketing digital avec 4 ans d'experience.
Competences: SEO/SEM, Google Analytics, Social Media, Content Strategy, Email Marketing, Facebook Ads, Google Ads.
Formation: Master en Marketing Digital, IHEC.
Experience: Marketing Manager chez DigiAgency (2022-2026).`,
    statut: 'NOUVELLE',  // ← Remis en NOUVELLE pour matching
    scoreGlobal: 75,
    scoreExp: 70,
    competencesDetectees: ['SEO', 'SEM', 'Google Analytics', 'Social Media', 'Email Marketing', 'Facebook Ads', 'Google Ads'],
    competencesManquantes: ['CRM', 'Content Strategy'],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null  // ✅ PASSIF - matching inverse
  },
  
  // Profil RH - candidature spontanee
  {
    nom: 'Haddad',
    prenom: 'Mehdi',
    email: 'mehdi.haddad@example.com',
    telephone: '+216 50 141 414',
    cvTexte: `Responsable RH avec 6 ans d'experience.
Competences: Recrutement, Gestion des talents, Paie, Droit social, SIRH, ADP, Sage.
Formation: Master en RH, IHEC.
Experience: Responsable RH chez HRCorp (2020-2026).`,
    statut: 'NOUVELLE',
    scoreGlobal: 82,
    scoreExp: 80,
    competencesDetectees: ['Recrutement', 'Gestion des talents', 'Paie', 'Droit social', 'SIRH', 'ADP', 'Sage'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null  // ✅ PASSIF - matching inverse
  },
  
  // Profil Finance - candidature spontanee
  {
    nom: 'Ben Ali',
    prenom: 'Rami',
    email: 'rami.benali@example.com',
    telephone: '+216 50 101 010',
    cvTexte: `Controleur de gestion avec 5 ans d'experience.
Competences: Comptabilite analytique, Budget, Reporting, SAP, Excel, Power BI, Tableau.
Formation: Master en Finance, IHEC.
Experience: Controleur de gestion chez FinCorp (2021-2026).`,
    statut: 'NOUVELLE',
    scoreGlobal: 82,
    scoreExp: 78,
    competencesDetectees: ['Comptabilite analytique', 'Budget', 'Reporting', 'SAP', 'Excel', 'Power BI', 'Tableau'],
    competencesManquantes: [],
    consentementRGPD: true,
    consentementIA: true,
    offreCible: null  // ✅ PASSIF - matching inverse
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

  // Afficher les offres disponibles
  const offresPubliees = await prisma.offreEmploi.findMany({ where: { statut: 'PUBLIEE' } });
  console.log('\n=== OFFRES DISPONIBLES ===');
  for (const offre of offresPubliees) {
    console.log(`   - ${offre.reference} : ${offre.intitule}`);
  }

  await prisma.candidature.deleteMany({});
  console.log('\n=== CREATION DES CANDIDATURES ===');

  let createdCount = 0;
  let candidatsActifs = 0;
  let candidatsPassifs = 0;
  let consentementIA = 0;

  for (const candidat of CANDIDATS) {
    let offreId = undefined;
    let offreTrouvee = null;
    let estActif = false;
    
    if (candidat.offreCible) {
      offreTrouvee = await getOffreByIntitule(candidat.offreCible);
      if (offreTrouvee) {
        offreId = offreTrouvee.id;
        estActif = true;
        candidatsActifs++;
        console.log(`   📝 ACTIF: ${candidat.prenom} ${candidat.nom} → A POSTULE A: ${offreTrouvee.intitule} (${candidat.statut}) - Score: ${candidat.scoreGlobal}%`);
      } else {
        console.log(`   ⚠️ ${candidat.prenom} ${candidat.nom} → Offre non trouvee: ${candidat.offreCible} (devient passif)`);
        candidatsPassifs++;
      }
    } else {
      candidatsPassifs++;
      console.log(`   🔄 PASSIF: ${candidat.prenom} ${candidat.nom} → (sans offre - matching inverse) - Score: ${candidat.scoreGlobal}%`);
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
  console.log(`Total candidatures creees: ${createdCount}`);
  console.log(`   📝 Candidats ACTIFS (ont postule): ${candidatsActifs}`);
  console.log(`   🔄 Candidats PASSIFS (matching inverse): ${candidatsPassifs}`);
  console.log(`   🤖 Consentement IA: ${consentementIA}/${createdCount}`);

  // Statistiques par statut
  const stats = await prisma.candidature.groupBy({
    by: ['statut'],
    _count: true
  });
  
  console.log(`\n=== REPARTITION PAR STATUT ===`);
  for (const stat of stats) {
    console.log(`   - ${stat.statut}: ${stat._count}`);
  }

  // Candidats actifs (ont postule)
  const actifsCount = await prisma.candidature.count({
    where: { offreId: { not: null } }
  });
  
  // Candidats passifs (matching inverse)
  const passifsCount = await prisma.candidature.count({
    where: { offreId: null, consentementIA: true }
  });
  
  console.log(`\n=== MATCHING INVERSE ===`);
  console.log(`📝 Candidats ayant postule: ${actifsCount}`);
  console.log(`   → Ils sont deja dans le processus de recrutement`);
  console.log(`🔄 Candidats passifs disponibles: ${passifsCount}`);
  console.log(`   → Seront proposes sur les NOUVELLES offres (matching inverse)`);
  
  // Afficher les candidats passifs
  if (passifsCount > 0) {
    const passifs = await prisma.candidature.findMany({
      where: { offreId: null, consentementIA: true },
      select: { prenom: true, nom: true, scoreGlobal: true, competencesDetectees: true }
    });
    console.log(`\n=== LISTE DES CANDIDATS PASSIFS (MATCHING INVERSE) ===`);
    for (const c of passifs) {
      console.log(`   🔄 ${c.prenom} ${c.nom} - Score: ${c.scoreGlobal}% - Competences: ${c.competencesDetectees.slice(0, 3).join(', ')}...`);
    }
  }
}

main()
  .catch(e => { console.error('Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());