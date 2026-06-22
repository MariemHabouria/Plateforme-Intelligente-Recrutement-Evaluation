import { Router } from 'express';
import { matchingInverseController } from '../controllers/matchingInverseController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();
const guard = [protect, authorize('DRH', 'SUPER_ADMIN')];

// Route statique AVANT toute route paramétrique /:offreId
router.get('/candidat/:candidatureId', ...guard, matchingInverseController.getCandidatPassifDetail);

// GET — lecture seule, idempotent
router.get('/:offreId', ...guard, matchingInverseController.executerMatching);

router.post('/:offreId/creer', ...guard, matchingInverseController.creerCandidaturesMatching);

export default router;