// backend/prisma/seed.ts

import { PrismaClient, CircuitType, Role } from '@prisma/client';
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

// Circuits de validation - 5 étapes maximum
const CIRCUITS = [
  {
    type: CircuitType.TECHNICIEN,
    nom: 'Technicien / Ouvrier',
    description: 'Postes techniques et ouvriers',
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
    ],
    totalEtapes: 2,
    delaiParDefaut: 48,
    actif: true
  },
  {
    type: CircuitType.EMPLOYE,
    nom: 'Employe / Agent',
    description: 'Postes administratifs',
    etapes: [
      { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
      { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
    ],
    totalEtapes: 2,
    delaiParDefaut: 48,
    actif: true
  },
  {
    type: CircuitType.CADRE_DEBUTANT,
    nom: 'Cadre debutant',
    description: 'Cadres juniors',
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
    type: CircuitType.CADRE_CONFIRME,
    nom: 'Cadre confirme',
    description: 'Cadres seniors',
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
    type: CircuitType.CADRE_SUPERIEUR,
    nom: 'Cadre superieur',
    description: 'Directeurs de departement',
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
    type: CircuitType.STRATEGIQUE,
    nom: 'Poste strategique',
    description: 'Postes de direction generale',
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
  }
];

// ⚠️ TYPES_POSTE_PAR_DIRECTION est SUPPRIMÉ - plus nécessaire

async function main() {
  console.log('Debut du seed...');
  
  await prisma.$connect();
  
  // 1. CREER LES DIRECTIONS
  console.log('\nCreation des directions...');
  for (const dir of DIRECTIONS) {
    await prisma.direction.upsert({
      where: { code: dir.code },
      update: {},
      create: dir,
    });
    console.log(`   ${dir.nom}`);
  }

  const directions = await prisma.direction.findMany();
  const directionMap = new Map(directions.map(d => [d.code, d]));

  // 2. CREER LES CIRCUITS DE VALIDATION
  console.log('\nCreation des circuits de validation...');
  for (const circuit of CIRCUITS) {
    await prisma.circuitConfig.upsert({
      where: { type: circuit.type },
      update: {
        nom: circuit.nom,
        description: circuit.description,
        etapes: circuit.etapes,
        totalEtapes: circuit.totalEtapes,
        delaiParDefaut: circuit.delaiParDefaut,
        actif: circuit.actif
      },
      create: {
        type: circuit.type,
        nom: circuit.nom,
        description: circuit.description,
        etapes: circuit.etapes,
        totalEtapes: circuit.totalEtapes,
        delaiParDefaut: circuit.delaiParDefaut,
        actif: circuit.actif
      }
    });
    console.log(`   ${circuit.nom}`);
  }

  // 3. CREER LES UTILISATEURS (plus de types de poste)
  console.log('\nCreation des utilisateurs...');

  const users = [
    { email: 'admin@kilani.tn', password: 'admin123', nom: 'Admin', prenom: 'Super', role: Role.SUPER_ADMIN, directionId: null, mustChangePassword: false },
    
    { email: 'manager.pharma@kilani.tn', password: 'manager123', nom: 'Ben Ali', prenom: 'Mohamed', role: Role.MANAGER, directionId: directionMap.get('DIR_PHARMA')?.id, mustChangePassword: true },
    { email: 'manager.si@kilani.tn', password: 'manager123', nom: 'Gharbi', prenom: 'Karim', role: Role.MANAGER, directionId: directionMap.get('DIR_SI')?.id, mustChangePassword: true },
    { email: 'manager.mkt@kilani.tn', password: 'manager123', nom: 'Hamdi', prenom: 'Nadia', role: Role.MANAGER, directionId: directionMap.get('DIR_MKT')?.id, mustChangePassword: true },
    
    { email: 'directeur.pharma@kilani.tn', password: 'directeur123', nom: 'Kilani', prenom: 'Ahmed', role: Role.DIRECTEUR, directionId: directionMap.get('DIR_PHARMA')?.id, mustChangePassword: true },
    { email: 'directeur.si@kilani.tn', password: 'directeur123', nom: 'Boukadida', prenom: 'Sonia', role: Role.DIRECTEUR, directionId: directionMap.get('DIR_SI')?.id, mustChangePassword: true },
    { email: 'directeur.mkt@kilani.tn', password: 'directeur123', nom: 'Mansour', prenom: 'Leila', role: Role.DIRECTEUR, directionId: directionMap.get('DIR_MKT')?.id, mustChangePassword: true },
    
    { email: 'rh@kilani.tn', password: 'rh123', nom: 'Karoui', prenom: 'Sonia', role: Role.DRH, directionId: null, mustChangePassword: true },
    { email: 'daf@kilani.tn', password: 'daf123', nom: 'Ben Ali', prenom: 'Rami', role: Role.DAF, directionId: null, mustChangePassword: true },
    { email: 'dga@kilani.tn', password: 'dga123', nom: 'Kilani', prenom: 'Nabil', role: Role.DGA, directionId: null, mustChangePassword: true },
    { email: 'dg@kilani.tn', password: 'dg123', nom: 'Kilani', prenom: 'Karim', role: Role.DG, directionId: null, mustChangePassword: true },
    { email: 'paie@kilani.tn', password: 'paie123', nom: 'Marzouk', prenom: 'Leila', role: Role.RESP_PAIE, directionId: null, mustChangePassword: true },
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
        role: user.role,
        directionId: user.directionId,
        actif: true,
        mustChangePassword: user.mustChangePassword,
      },
    });
    console.log(`   ${user.email} (${user.role})`);
  }
  
  console.log('\nSeed termine avec succes !');
  console.log(`\nRESUME:`);
  console.log(`   - ${directions.length} directions creees`);
  console.log(`   - ${CIRCUITS.length} circuits configures`);
  console.log(`   - ${users.length} utilisateurs crees`);
  
  console.log('\nCOMPTES DE TEST:');
  console.log('   SUPER ADMIN: admin@kilani.tn / admin123');
  console.log('   MANAGER (Pharma): manager.pharma@kilani.tn / manager123');
  console.log('   DIRECTEUR (Pharma): directeur.pharma@kilani.tn / directeur123');
  console.log('   DRH: rh@kilani.tn / rh123');
  console.log('   DAF: daf@kilani.tn / daf123');
  console.log('   DGA: dga@kilani.tn / dga123');
  console.log('   DG: dg@kilani.tn / dg123');
  console.log('   PAIE: paie@kilani.tn / paie123');
}

main()
  .catch(e => {
    console.error('Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });