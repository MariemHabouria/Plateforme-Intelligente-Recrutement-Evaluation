// backend/src/routes/evaluationPERoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import {
  declencherEvaluations,
  getEvaluations,
  getEvaluationById,
  soumettreDonneesPaie,
  soumettreEvaluationN1,
  validerEvaluationN2,  // ✅ Changé de validerEvaluation à validerEvaluationN2
  deleteEvaluation
} from '../controllers/evaluationPEController';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes
router.post('/declencher', authorize('SUPER_ADMIN', 'RESP_PAIE'), declencherEvaluations);
router.get('/', getEvaluations);
router.get('/:id', getEvaluationById);
router.post('/:id/soumettre-paie', authorize('RESP_PAIE'), soumettreDonneesPaie);
router.post('/:id/soumettre-n1', authorize('MANAGER'), soumettreEvaluationN1);
router.post('/:id/valider-n2', authorize('DIRECTEUR'), validerEvaluationN2);
router.delete('/:id', authorize('SUPER_ADMIN', 'RESP_PAIE'), deleteEvaluation);

export default router;