import { Router } from 'express';
import {
  getDemandes,
  getDemandeById,
  createDemande,
  updateDemande,
  deleteDemande,
  submitDemande,
  validerDemande
} from '../controllers/demandeController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

router.use(protect);

router.get('/', getDemandes);
router.get('/:id', getDemandeById);
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), createDemande);
router.patch('/:id', authorize('MANAGER', 'SUPER_ADMIN'), updateDemande);
router.delete('/:id', authorize('MANAGER', 'SUPER_ADMIN'), deleteDemande);
router.post('/:id/submit', authorize('MANAGER', 'SUPER_ADMIN'), submitDemande);
router.post('/:id/valider', authorize('DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'), validerDemande);

export default router;