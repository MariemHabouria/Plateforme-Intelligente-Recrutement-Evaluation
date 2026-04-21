import { Router } from 'express';
import {
  executerMatchingInverse,
  creerCandidaturesMatching,
  getCandidaturesMatchingInverse,
  getCandidatPassifDetail 
} from '../controllers/matchingInverseController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

router.post('/:offreId', protect, authorize('DRH', 'SUPER_ADMIN'), executerMatchingInverse);
router.post('/:offreId/creer', protect, authorize('DRH', 'SUPER_ADMIN'), creerCandidaturesMatching);
router.get('/:offreId/candidatures', protect, authorize('DRH', 'SUPER_ADMIN'), getCandidaturesMatchingInverse);
router.get('/candidat/:candidatureId', protect, authorize('DRH', 'SUPER_ADMIN'), getCandidatPassifDetail);
export default router;