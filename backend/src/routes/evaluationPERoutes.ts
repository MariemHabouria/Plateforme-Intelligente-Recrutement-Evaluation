// backend/src/routes/evaluationPERoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import {
  declencherEvaluations,
  getEvaluations,
  getEvaluationById,
  soumettreDonneesPaie,
  soumettreEvaluationN1,
  validerEvaluationN2,
  masquerEvaluationN1,
  proposerModificationContrat,
  validerModificationDRH,
  deleteEvaluation,
  relancerEvaluation
} from '../controllers/evaluationPEController';

const router = Router();

router.use(protect);

router.post('/declencher', authorize('SUPER_ADMIN', 'RESP_PAIE'), declencherEvaluations);
router.get('/', getEvaluations);
router.get('/:id', getEvaluationById);
router.post('/:id/soumettre-paie', authorize('RESP_PAIE'), soumettreDonneesPaie);
router.post('/:id/soumettre-n1', authorize('MANAGER'), soumettreEvaluationN1);
router.post('/:id/valider-n2', authorize('DIRECTEUR'), validerEvaluationN2);
router.post('/:id/masquer-n1', authorize('DIRECTEUR', 'SUPER_ADMIN'), masquerEvaluationN1);

// Circuit 2 — matérialisation contractuelle
router.post('/:id/proposer-modification', authorize('RESP_PAIE', 'SUPER_ADMIN'), proposerModificationContrat);
router.post('/:id/valider-modification-drh', authorize('DRH', 'SUPER_ADMIN'), validerModificationDRH);

router.delete('/:id', authorize('SUPER_ADMIN', 'RESP_PAIE'), deleteEvaluation);
router.post('/:id/relancer/:niveauEtape', authorize('RESP_PAIE', 'SUPER_ADMIN'), relancerEvaluation);

export default router;