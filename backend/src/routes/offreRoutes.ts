// backend/src/routes/offreRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import {
  getOffres,
  getOffreById,
  getOffreParToken,
  getDemandesSansOffre,
  createOffre,
  publierOffre,
  updateOffre,
  deleteOffre
} from '../controllers/offreController';
import { getDisponibilitesByOffre } from '../controllers/offreController';
const router = Router();

// ============================================
// ROUTES PUBLIQUES
// ============================================
router.get('/public/:token', getOffreParToken);

// ============================================
// ROUTES PROTEGEES
// ============================================
router.use(protect);

// ✅ Routes statiques EN PREMIER (avant /:id)
router.get('/demandes-sans-offre', authorize('DRH', 'SUPER_ADMIN'), getDemandesSansOffre);



// Routes génériques
router.get('/', getOffres);
router.post('/', authorize('DRH', 'SUPER_ADMIN'), createOffre);


router.get('/:id', getOffreById);
router.put('/:id', authorize('DRH', 'SUPER_ADMIN'), updateOffre);
router.delete('/:id', authorize('DRH', 'SUPER_ADMIN'), deleteOffre);
router.post('/:id/publier', authorize('DRH', 'SUPER_ADMIN'), publierOffre);
router.get('/:offreId/disponibilites', protect, authorize('DRH', 'SUPER_ADMIN'), getDisponibilitesByOffre);
export default router;