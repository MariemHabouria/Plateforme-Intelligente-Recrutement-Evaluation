// backend/src/routes/offreRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';  // ← CORRECTION : utiliser protect et authorize
import {
  getOffres,
  getOffreById,
  genererOffreAvecIA,
  createOffre,
  publierOffre,
  updateOffre,
  deleteOffre
} from '../controllers/offreController';

const router = Router();

// 🔐 Toutes les routes nécessitent authentification
router.use(protect);

// 👁️ Routes de visualisation
router.get('/', getOffres);
router.get('/:id', getOffreById);

// 🤖 Génération IA (seulement RH et SUPER_ADMIN)
router.post('/generer-ia', authorize('DRH', 'SUPER_ADMIN'), genererOffreAvecIA);

// ✏️ CRUD complet (seulement RH et SUPER_ADMIN)
router.post('/', authorize('DRH', 'SUPER_ADMIN'), createOffre);
router.put('/:id', authorize('DRH', 'SUPER_ADMIN'), updateOffre);
router.delete('/:id', authorize('DRH', 'SUPER_ADMIN'), deleteOffre);

// 📢 Publication multi-canaux (seulement RH et SUPER_ADMIN)
router.post('/:id/publier', authorize('DRH', 'SUPER_ADMIN'), publierOffre);

export default router;