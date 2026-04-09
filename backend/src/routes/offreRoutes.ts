// backend/src/routes/offreRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import {
  getOffres,
  getOffreById,
  getOffreParToken,
  getDemandesSansOffre,
  genererOffreAvecIA,
  createOffre,
  publierOffre,
  updateOffre,
  deleteOffre
} from '../controllers/offreController';

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

// ✅ Routes POST statiques EN PREMIER (avant /:id/publier)
router.post('/generer-ia', authorize('DRH', 'SUPER_ADMIN'), genererOffreAvecIA);

// Routes génériques
router.get('/', getOffres);
router.post('/', authorize('DRH', 'SUPER_ADMIN'), createOffre);

// ✅ Routes avec :id EN DERNIER
router.get('/:id', getOffreById);
router.put('/:id', authorize('DRH', 'SUPER_ADMIN'), updateOffre);
router.delete('/:id', authorize('DRH', 'SUPER_ADMIN'), deleteOffre);
router.post('/:id/publier', authorize('DRH', 'SUPER_ADMIN'), publierOffre);

export default router;