import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Début du seed...');
  
  await prisma.$connect();
  console.log('✅ Connexion à la base de données établie');
  
  // ============================================
  // 1. CRÉER LES UTILISATEURS
  // ============================================
  const users = [
    { email: 'admin@kilani.tn',     password: 'admin123',     nom: 'Admin',   prenom: 'Super',   role: 'SUPER_ADMIN', mustChangePassword: false },
    { email: 'manager@kilani.tn',   password: 'manager123',   nom: 'Kilani',  prenom: 'Mohamed', role: 'MANAGER',     mustChangePassword: true  },
    { email: 'directeur@kilani.tn', password: 'directeur123', nom: 'Kilani',  prenom: 'Ahmed',   role: 'DIRECTEUR',   mustChangePassword: true  },
    { email: 'rh@kilani.tn',        password: 'rh123',        nom: 'Karoui',  prenom: 'Sonia',   role: 'DRH',         mustChangePassword: true  },
    { email: 'daf@kilani.tn',       password: 'daf123',       nom: 'Ben Ali', prenom: 'Rami',    role: 'DAF',         mustChangePassword: true  },
    { email: 'dga@kilani.tn',       password: 'dga123',       nom: 'Kilani',  prenom: 'Nabil',   role: 'DGA',         mustChangePassword: true  },
    { email: 'paie@kilani.tn',      password: 'paie123',      nom: 'Marzouk', prenom: 'Leila',   role: 'RESP_PAIE',   mustChangePassword: true  },
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
        actif: true,
        mustChangePassword: user.mustChangePassword,
      },
    });
    console.log(`✅ Utilisateur créé: ${user.email}`);
  }
  
  // ============================================
  // 2. CRÉER LES CIRCUITS DE VALIDATION
  // ============================================
  console.log('\n📋 Création des circuits de validation...');
  
  const circuits = [
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
      totalEtapes: 3,
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
      totalEtapes: 3,
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
      totalEtapes: 4,
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
      totalEtapes: 5,
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
      totalEtapes: 6,
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
      totalEtapes: 7,
      delaiParDefaut: 48,
      actif: true
    }
  ];
  
  for (const circuit of circuits) {
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
    console.log(`✅ Circuit créé: ${circuit.nom}`);
  }
  
  console.log('\n✅ Seed terminé avec succès !');
  console.log('📋 Comptes de test:');
  console.log('   - admin@kilani.tn / admin123 (Super Admin)');
  console.log('   - manager@kilani.tn / manager123');
  console.log('   - directeur@kilani.tn / directeur123');
  console.log('   - rh@kilani.tn / rh123');
  console.log('   - daf@kilani.tn / daf123');
  console.log('   - dga@kilani.tn / dga123');
  console.log('   - paie@kilani.tn / paie123');
  console.log('\n📋 Circuits de validation:');
  console.log('   - Technicien (0-18k DT) → 3 étapes');
  console.log('   - Employé (18k-24k DT) → 3 étapes');
  console.log('   - Cadre débutant (24k-30k DT) → 4 étapes');
  console.log('   - Cadre confirmé (30k-48k DT) → 5 étapes');
  console.log('   - Cadre supérieur (48k-84k DT) → 6 étapes');
  console.log('   - Stratégique (>84k DT) → 7 étapes');
}

main()
  .catch(e => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });