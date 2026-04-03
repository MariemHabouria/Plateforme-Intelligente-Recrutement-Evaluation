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
router.post('/', createDemande);  // Tous les rôles (sauf Paie) peuvent créer
router.patch('/:id', updateDemande);
router.delete('/:id', deleteDemande);
router.post('/:id/submit', submitDemande);
router.post('/:id/valider', authorize('DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG', 'SUPER_ADMIN'), validerDemande);

export default router;