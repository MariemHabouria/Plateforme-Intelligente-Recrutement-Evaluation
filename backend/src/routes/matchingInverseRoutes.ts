// backend/src/routes/matchingInverseRoutes.ts

import { Router } from 'express';
import { matchingInverseController } from '../controllers/matchingInverseController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// POST /api/matching-inverse/:offreId - Exécuter le matching inverse
router.post(
  '/:offreId', 
  protect, 
  authorize('DRH', 'SUPER_ADMIN'), 
  matchingInverseController.executerMatching
);

// POST /api/matching-inverse/:offreId/creer - Créer des candidatures à partir du matching
router.post(
  '/:offreId/creer', 
  protect, 
  authorize('DRH', 'SUPER_ADMIN'), 
  matchingInverseController.creerCandidaturesMatching
);

// GET /api/matching-inverse/:offreId/candidatures - Récupérer les candidatures matching
router.get(
  '/:offreId/candidatures', 
  protect, 
  authorize('DRH', 'SUPER_ADMIN'), 
  matchingInverseController.getCandidaturesMatching
);

// GET /api/matching-inverse/candidat/:candidatureId - Récupérer les détails d'un candidat passif
router.get(
  '/candidat/:candidatureId', 
  protect, 
  authorize('DRH', 'SUPER_ADMIN'), 
  matchingInverseController.getCandidatPassifDetail
);

export default router;