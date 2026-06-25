// backend/prisma/seed-employes.ts

import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Debut du seed des employes...');
  await prisma.$connect();

  // Recuperer les directions
  const directionPharma = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_PHARMA' } });
  const directionSI     = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_SI' } });
  const directionMKT    = await prisma.direction.findFirstOrThrow({ where: { code: 'DIR_MKT' } });

  // Recuperer les managers (pour lier managerId)
  const managerPharma = await prisma.user.findFirstOrThrow({ where: { email: 'manager.pharma@kilani.tn' } });
  const managerSI     = await prisma.user.findFirstOrThrow({ where: { email: 'manager.si@kilani.tn' } });
  const managerMKT    = await prisma.user.findFirstOrThrow({ where: { email: 'manager.mkt@kilani.tn' } });

  const employes = [
    // PHARMA
    { email: 'employe1.pharma@kilani.tn', password: 'employe123', nom: 'Trabelsi', prenom: 'Fathi', poste: 'Technicien de laboratoire', directionId: directionPharma.id, managerId: managerPharma.id },
    { email: 'employe2.pharma@kilani.tn', password: 'employe123', nom: 'Bouzid', prenom: 'Amira', poste: 'Pharmacien AQ', directionId: directionPharma.id, managerId: managerPharma.id },

    // SI
    { email: 'employe1.si@kilani.tn', password: 'employe123', nom: 'Gharbi', prenom: 'Karim', poste: 'Developpeur Full Stack', directionId: directionSI.id, managerId: managerSI.id },
    { email: 'employe2.si@kilani.tn', password: 'employe123', nom: 'Boukadida', prenom: 'Sonia', poste: 'Developpeuse Full Stack', directionId: directionSI.id, managerId: managerSI.id },

    // MKT
    { email: 'employe1.mkt@kilani.tn', password: 'employe123', nom: 'Hamdi', prenom: 'Ines', poste: 'Community Manager', directionId: directionMKT.id, managerId: managerMKT.id },
    { email: 'employe2.mkt@kilani.tn', password: 'employe123', nom: 'Mansour', prenom: 'Youssef', poste: 'Chef de Produit Marketing', directionId: directionMKT.id, managerId: managerMKT.id },
  ];

  console.log('\nCreation des employes...');
  for (const e of employes) {
    const hashedPassword = await bcrypt.hash(e.password, 10);

    await prisma.user.upsert({
      where: { email: e.email },
      update: {},
      create: {
        email: e.email,
        password: hashedPassword,
        nom: e.nom,
        prenom: e.prenom,
        role: Role.EMPLOYE,
        poste: e.poste,
        directionId: e.directionId,
        managerId: e.managerId,
        actif: true,
        mustChangePassword: true,
      },
    });
    console.log(`   ${e.email} (EMPLOYE - ${e.poste})`);
  }

  console.log('\nSeed employes termine avec succes !');
  console.log(`\nRESUME:`);
  console.log(`   - ${employes.length} employes crees`);
  console.log('\nCOMPTES DE TEST:');
  for (const e of employes) {
    console.log(`   EMPLOYE: ${e.email} / ${e.password}`);
  }
}

main()
  .catch(e => {
    console.error('Erreur seed-employes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });