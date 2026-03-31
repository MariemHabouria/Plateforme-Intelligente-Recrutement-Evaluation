import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// Liste des 14 directions Kilani
const DIRECTIONS = [
  { code: 'DIR_PHARMA', nom: 'Direction Pharmaceutique' },
  { code: 'DIR_DISTRIB', nom: 'Direction Distribution' },
  { code: 'DIR_RETAIL', nom: 'Direction Retail' },
  { code: 'DIR_INDUSTRIE', nom: 'Direction Industrielle' },
  { code: 'DIR_BTP', nom: 'Direction BTP' },
  { code: 'DIR_AUTO', nom: 'Direction Automobile' },
  { code: 'DIR_CONSTRUCT', nom: 'Direction Construction' },
  { code: 'DIR_CULTURE', nom: 'Direction Art & Culture' },
  { code: 'DIR_SI', nom: 'Direction Systèmes d\'Information' },
  { code: 'DIR_MKT', nom: 'Direction Marketing & Digital' },
  { code: 'DIR_JUR', nom: 'Direction Juridique' },
  { code: 'DIR_LOG', nom: 'Direction Logistique' },
  { code: 'DIR_COM', nom: 'Direction Commerciale' },
  { code: 'DIR_TECH', nom: 'Direction Technique & Engineering' },
];

// Circuits de validation
const CIRCUITS = [
  {
    type: 'TECHNICIEN',
    nom: 'Technicien / Ouvrier',
    description: 'Pour les postes techniques et ouvriers (salaire annuel < 18 000 DT)',
    seuilMin: 0,
    seuilMax: 18000,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
    ],
    totalEtapes: 2,
    delaiParDefaut: 48,
    actif: true
  },
  {
    type: 'EMPLOYE',
    nom: 'Employé / Agent',
    description: 'Pour les postes administratifs (salaire annuel 18k - 24k DT)',
    seuilMin: 18000,
    seuilMax: 24000,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
    ],
    totalEtapes: 2,
    delaiParDefaut: 48,
    actif: true
  },
  {
    type: 'CADRE_DEBUTANT',
    nom: 'Cadre débutant',
    description: 'Cadres juniors (salaire annuel 24k - 30k DT)',
    seuilMin: 24000,
    seuilMax: 30000,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 }
    ],
    totalEtapes: 3,
    delaiParDefaut: 48,
    actif: true
  },
  {
    type: 'CADRE_CONFIRME',
    nom: 'Cadre confirmé',
    description: 'Cadres seniors (salaire annuel 30k - 48k DT)',
    seuilMin: 30000,
    seuilMax: 48000,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 }
    ],
    totalEtapes: 4,
    delaiParDefaut: 48,
    actif: true
  },
  {
    type: 'CADRE_SUPERIEUR',
    nom: 'Cadre supérieur',
    description: 'Directeurs de département (salaire annuel 48k - 84k DT)',
    seuilMin: 48000,
    seuilMax: 84000,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
      { niveau: 5, role: 'DG', label: 'DG', delai: 48 }
    ],
    totalEtapes: 5,
    delaiParDefaut: 48,
    actif: true
  },
  {
    type: 'STRATEGIQUE',
    nom: 'Poste stratégique',
    description: 'Postes de direction et stratégiques (salaire annuel > 84k DT)',
    seuilMin: 84000,
    seuilMax: null,
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
      { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
      { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
      { niveau: 5, role: 'DG', label: 'DG', delai: 48 },
      { niveau: 6, role: 'CONSEIL', label: 'Conseil d\'administration', delai: 72 }
    ],
    totalEtapes: 6,
    delaiParDefaut: 48,
    actif: true
  }
];

async function main() {
  console.log('🌱 Début du seed...');
  
  await prisma.$connect();
  console.log('✅ Connexion à la base de données établie');
  
  // ============================================
  // 1. CRÉER LES DIRECTIONS
  // ============================================
  console.log('\n📁 Création des directions...');
  for (const dir of DIRECTIONS) {
    await prisma.direction.upsert({
      where: { code: dir.code },
      update: {},
      create: dir,
    });
    console.log(`   ✅ ${dir.nom}`);
  }

  // Récupérer les directions créées
  const directions = await prisma.direction.findMany();
  const directionMap = new Map(directions.map(d => [d.code, d]));

  // ============================================
  // 2. CRÉER LES CIRCUITS DE VALIDATION
  // ============================================
  console.log('\n📋 Création des circuits de validation...');
  for (const circuit of CIRCUITS) {
    await prisma.circuitConfig.upsert({
      where: { type: circuit.type as any },
      update: {
        nom: circuit.nom,
        description: circuit.description,
        seuilMin: circuit.seuilMin,
        seuilMax: circuit.seuilMax,
        etapes: circuit.etapes,
        totalEtapes: circuit.totalEtapes,
        delaiParDefaut: circuit.delaiParDefaut,
        actif: circuit.actif
      },
      create: {
        type: circuit.type as any,
        nom: circuit.nom,
        description: circuit.description,
        seuilMin: circuit.seuilMin,
        seuilMax: circuit.seuilMax,
        etapes: circuit.etapes,
        totalEtapes: circuit.totalEtapes,
        delaiParDefaut: circuit.delaiParDefaut,
        actif: circuit.actif
      }
    });
    console.log(`   ✅ ${circuit.nom}`);
  }

  // ============================================
  // 3. CRÉER LES UTILISATEURS
  // ============================================
  console.log('\n👥 Création des utilisateurs...');

  const users = [
    // SUPER ADMIN (pas de direction)
    { email: 'admin@kilani.tn', password: 'admin123', nom: 'Admin', prenom: 'Super', role: 'SUPER_ADMIN', directionId: null, mustChangePassword: false },
    
    // ===== MANAGERS (un par direction) =====
    { email: 'manager.pharma@kilani.tn', password: 'manager123', nom: 'Ben Ali', prenom: 'Mohamed', role: 'MANAGER', directionId: directionMap.get('DIR_PHARMA')?.id, mustChangePassword: true },
    { email: 'manager.distrib@kilani.tn', password: 'manager123', nom: 'Trabelsi', prenom: 'Sami', role: 'MANAGER', directionId: directionMap.get('DIR_DISTRIB')?.id, mustChangePassword: true },
    { email: 'manager.retail@kilani.tn', password: 'manager123', nom: 'Mansour', prenom: 'Leila', role: 'MANAGER', directionId: directionMap.get('DIR_RETAIL')?.id, mustChangePassword: true },
    { email: 'manager.industrie@kilani.tn', password: 'manager123', nom: 'Jemli', prenom: 'Hichem', role: 'MANAGER', directionId: directionMap.get('DIR_INDUSTRIE')?.id, mustChangePassword: true },
    { email: 'manager.btp@kilani.tn', password: 'manager123', nom: 'Boukadida', prenom: 'Sonia', role: 'MANAGER', directionId: directionMap.get('DIR_BTP')?.id, mustChangePassword: true },
    { email: 'manager.auto@kilani.tn', password: 'manager123', nom: 'Gharbi', prenom: 'Karim', role: 'MANAGER', directionId: directionMap.get('DIR_AUTO')?.id, mustChangePassword: true },
    { email: 'manager.construct@kilani.tn', password: 'manager123', nom: 'Mhiri', prenom: 'Sonia', role: 'MANAGER', directionId: directionMap.get('DIR_CONSTRUCT')?.id, mustChangePassword: true },
    { email: 'manager.culture@kilani.tn', password: 'manager123', nom: 'Chaabane', prenom: 'Fathi', role: 'MANAGER', directionId: directionMap.get('DIR_CULTURE')?.id, mustChangePassword: true },
    { email: 'manager.si@kilani.tn', password: 'manager123', nom: 'Zouari', prenom: 'Meriem', role: 'MANAGER', directionId: directionMap.get('DIR_SI')?.id, mustChangePassword: true },
    { email: 'manager.mkt@kilani.tn', password: 'manager123', nom: 'Hamdi', prenom: 'Nadia', role: 'MANAGER', directionId: directionMap.get('DIR_MKT')?.id, mustChangePassword: true },
    { email: 'manager.jur@kilani.tn', password: 'manager123', nom: 'Karray', prenom: 'Ridha', role: 'MANAGER', directionId: directionMap.get('DIR_JUR')?.id, mustChangePassword: true },
    { email: 'manager.log@kilani.tn', password: 'manager123', nom: 'Kilani', prenom: 'Ahmed', role: 'MANAGER', directionId: directionMap.get('DIR_LOG')?.id, mustChangePassword: true },
    { email: 'manager.com@kilani.tn', password: 'manager123', nom: 'Ben Ali', prenom: 'Rami', role: 'MANAGER', directionId: directionMap.get('DIR_COM')?.id, mustChangePassword: true },
    { email: 'manager.tech@kilani.tn', password: 'manager123', nom: 'Karoui', prenom: 'Sonia', role: 'MANAGER', directionId: directionMap.get('DIR_TECH')?.id, mustChangePassword: true },
    
    // ===== DIRECTEURS (un par direction) =====
    { email: 'directeur.pharma@kilani.tn', password: 'directeur123', nom: 'Kilani', prenom: 'Ahmed', role: 'DIRECTEUR', directionId: directionMap.get('DIR_PHARMA')?.id, mustChangePassword: true },
    { email: 'directeur.distrib@kilani.tn', password: 'directeur123', nom: 'Hamdi', prenom: 'Nadia', role: 'DIRECTEUR', directionId: directionMap.get('DIR_DISTRIB')?.id, mustChangePassword: true },
    { email: 'directeur.retail@kilani.tn', password: 'directeur123', nom: 'Karray', prenom: 'Ridha', role: 'DIRECTEUR', directionId: directionMap.get('DIR_RETAIL')?.id, mustChangePassword: true },
    { email: 'directeur.industrie@kilani.tn', password: 'directeur123', nom: 'Chaabane', prenom: 'Fathi', role: 'DIRECTEUR', directionId: directionMap.get('DIR_INDUSTRIE')?.id, mustChangePassword: true },
    { email: 'directeur.btp@kilani.tn', password: 'directeur123', nom: 'Zouari', prenom: 'Meriem', role: 'DIRECTEUR', directionId: directionMap.get('DIR_BTP')?.id, mustChangePassword: true },
    { email: 'directeur.auto@kilani.tn', password: 'directeur123', nom: 'Mhiri', prenom: 'Sonia', role: 'DIRECTEUR', directionId: directionMap.get('DIR_AUTO')?.id, mustChangePassword: true },
    { email: 'directeur.construct@kilani.tn', password: 'directeur123', nom: 'Gharbi', prenom: 'Karim', role: 'DIRECTEUR', directionId: directionMap.get('DIR_CONSTRUCT')?.id, mustChangePassword: true },
    { email: 'directeur.culture@kilani.tn', password: 'directeur123', nom: 'Jemli', prenom: 'Hichem', role: 'DIRECTEUR', directionId: directionMap.get('DIR_CULTURE')?.id, mustChangePassword: true },
    { email: 'directeur.si@kilani.tn', password: 'directeur123', nom: 'Boukadida', prenom: 'Sonia', role: 'DIRECTEUR', directionId: directionMap.get('DIR_SI')?.id, mustChangePassword: true },
    { email: 'directeur.mkt@kilani.tn', password: 'directeur123', nom: 'Mansour', prenom: 'Leila', role: 'DIRECTEUR', directionId: directionMap.get('DIR_MKT')?.id, mustChangePassword: true },
    { email: 'directeur.jur@kilani.tn', password: 'directeur123', nom: 'Trabelsi', prenom: 'Sami', role: 'DIRECTEUR', directionId: directionMap.get('DIR_JUR')?.id, mustChangePassword: true },
    { email: 'directeur.log@kilani.tn', password: 'directeur123', nom: 'Ben Ali', prenom: 'Mohamed', role: 'DIRECTEUR', directionId: directionMap.get('DIR_LOG')?.id, mustChangePassword: true },
    { email: 'directeur.com@kilani.tn', password: 'directeur123', nom: 'Kilani', prenom: 'Nabil', role: 'DIRECTEUR', directionId: directionMap.get('DIR_COM')?.id, mustChangePassword: true },
    { email: 'directeur.tech@kilani.tn', password: 'directeur123', nom: 'Karoui', prenom: 'Leila', role: 'DIRECTEUR', directionId: directionMap.get('DIR_TECH')?.id, mustChangePassword: true },
    
    // ===== RÔLES TRANSVERSAUX (pas de direction) =====
    { email: 'rh@kilani.tn', password: 'rh123', nom: 'Karoui', prenom: 'Sonia', role: 'DRH', directionId: null, mustChangePassword: true },
    { email: 'daf@kilani.tn', password: 'daf123', nom: 'Ben Ali', prenom: 'Rami', role: 'DAF', directionId: null, mustChangePassword: true },
    { email: 'dga@kilani.tn', password: 'dga123', nom: 'Kilani', prenom: 'Nabil', role: 'DGA', directionId: null, mustChangePassword: true },
    { email: 'dg@kilani.tn', password: 'dg123', nom: 'Kilani', prenom: 'Karim', role: 'DG', directionId: null, mustChangePassword: true },
    { email: 'paie@kilani.tn', password: 'paie123', nom: 'Marzouk', prenom: 'Leila', role: 'RESP_PAIE', directionId: null, mustChangePassword: true },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        password: hashedPassword,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role as any,
        directionId: user.directionId,
        actif: true,
        mustChangePassword: user.mustChangePassword,
      },
    });
    console.log(`   ✅ ${user.email} (${user.role})`);
  }
  
  console.log('\n✅ Seed terminé avec succès !');
  console.log(`\n📊 RÉCAPITULATIF:`);
  console.log(`   - ${directions.length} directions créées`);
  console.log(`   - ${CIRCUITS.length} circuits configurés`);
  console.log(`   - ${users.length} utilisateurs créés`);
  
  console.log('\n🔑 COMPTES DE TEST:');
  console.log('   ┌─────────────────────────────────────────────────────────┐');
  console.log('   │ SUPER ADMIN:                                            │');
  console.log('   │   admin@kilani.tn / admin123                            │');
  console.log('   │                                                         │');
  console.log('   │ MANAGER (Pharma):                                       │');
  console.log('   │   manager.pharma@kilani.tn / manager123                 │');
  console.log('   │                                                         │');
  console.log('   │ DIRECTEUR (Pharma):                                     │');
  console.log('   │   directeur.pharma@kilani.tn / directeur123             │');
  console.log('   │                                                         │');
  console.log('   │ RÔLES TRANSVERSAUX:                                     │');
  console.log('   │   rh@kilani.tn / rh123                                  │');
  console.log('   │   daf@kilani.tn / daf123                                │');
  console.log('   │   dga@kilani.tn / dga123                                │');
  console.log('   │   dg@kilani.tn / dg123                                  │');
  console.log('   │   paie@kilani.tn / paie123                              │');
  console.log('   └─────────────────────────────────────────────────────────┘');
}

main()
  .catch(e => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });