// backend/scripts/list-validations.ts
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/prisma';
import { ValidationTokenService } from '../src/middlewares/auth';

async function listAllValidations() {
  // Utiliser un tableau de statuts au lieu de startsWith
  const statuts = [
    'EN_VALIDATION_DIR',
    'EN_VALIDATION_DRH',
    'EN_VALIDATION_DAF',
    'EN_VALIDATION_DGA',
    'EN_VALIDATION_DG'
  ];

  const demandes = await prisma.demandeRecrutement.findMany({
    where: {
      statut: { in: statuts as any }
    },
    include: {
      validations: {
        where: { decision: 'EN_ATTENTE' },
        include: { acteur: true }
      },
      createur: true,
      direction: true
    }
  });

  console.log(`\n${demandes.length} demande(s) en attente de validation\n`);

  if (demandes.length === 0) {
    console.log('Aucune demande en attente de validation.');
    console.log('Statuts disponibles:');
    const stats = await prisma.demandeRecrutement.groupBy({
      by: ['statut'],
      _count: true
    });
    for (const s of stats) {
      console.log(`  ${s.statut}: ${s._count}`);
    }
    return;
  }

  for (const demande of demandes) {
    const validation = demande.validations[0];
    if (validation) {
      const token = ValidationTokenService.genererToken(
        demande.id,
        validation.acteur.role,
        validation.niveauEtape
      );

      const url = ValidationTokenService.genererUrlWorkflow(
        demande.id,
        validation.acteur.role,
        validation.niveauEtape
      );

      console.log('========================================');
      console.log(`Reference: ${demande.reference}`);
      console.log(`Poste: ${demande.intitulePoste}`);
      console.log(`Statut: ${demande.statut}`);
      console.log(`Validateur: ${validation.acteur.role} (${validation.acteur.email})`);
      console.log(`Etape: ${validation.niveauEtape}`);
      console.log(`Token: ${token}`);
      console.log(`URL: ${url}`);
      console.log('========================================\n');
    }
  }
}

listAllValidations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());