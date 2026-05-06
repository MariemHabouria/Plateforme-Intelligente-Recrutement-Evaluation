// backend/src/routes/contratRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import {
  getDonneesPrecontrat,
  createContrat,
  getContrats,
  getContratById,
  envoyerContrat,
  consulterContrat,
  signerContrat,
  telechargerPDF,
  updateContratStatut,
  createAvenant,
  getAvenants
} from '../controllers/contratController';

const router = Router();

// Routes publiques (consultation sans authentification)
router.get('/consultation/:id', consulterContrat);
router.get('/:id/pdf', telechargerPDF);

// Routes protégées
router.use(protect);

// Données pour pré-remplir
router.get('/precontrat/:candidatureId', authorize('RESP_PAIE', 'SUPER_ADMIN'), getDonneesPrecontrat);

// Contrats
router.post('/', authorize('RESP_PAIE', 'SUPER_ADMIN'), createContrat);
router.get('/', authorize('RESP_PAIE', 'SUPER_ADMIN', 'EMPLOYE'), getContrats);
router.get('/:id', authorize('RESP_PAIE', 'SUPER_ADMIN', 'EMPLOYE'), getContratById);
router.post('/:id/envoyer', authorize('RESP_PAIE', 'SUPER_ADMIN'), envoyerContrat);
router.post('/:id/signer', authorize('RESP_PAIE', 'SUPER_ADMIN'), signerContrat);
router.patch('/:id/statut', authorize('RESP_PAIE', 'SUPER_ADMIN'), updateContratStatut);

// Avenants
router.post('/:contratId/avenants', authorize('RESP_PAIE', 'SUPER_ADMIN'), createAvenant);
router.get('/:contratId/avenants', authorize('RESP_PAIE', 'SUPER_ADMIN'), getAvenants);

export default router;