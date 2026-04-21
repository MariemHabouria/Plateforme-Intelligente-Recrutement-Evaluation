// backend/src/routes/candidatureRoutes.ts

import { Router } from 'express';
import {
  soumettreCandidature,
  getCandidatures,
  getCandidatureById,
  updateCandidatureStatut,
  deleteCandidature
} from '../controllers/candidatureController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// 1. Routes PUBLIQUES (sans auth)
router.post('/public/:token', soumettreCandidature);

// 2. Routes PROTÉGÉES avec paramètres fixes d'abord
router.get('/statuts', protect, authorize('DRH', 'SUPER_ADMIN'), (req, res) => {
  res.json({ statuts: ['NOUVELLE', 'PRESELECTIONNEE', 'ENTRETIEN', 'ACCEPTEE', 'REFUSEE'] });
});

// 3. Routes PROTÉGÉES standards
router.get('/', protect, authorize('DRH', 'SUPER_ADMIN'), getCandidatures);
router.get('/:id', protect, authorize('DRH', 'SUPER_ADMIN'), getCandidatureById);
router.patch('/:id/statut', protect, authorize('DRH', 'SUPER_ADMIN'), updateCandidatureStatut);
router.delete('/:id', protect, authorize('DRH', 'SUPER_ADMIN'), deleteCandidature);

export default router;