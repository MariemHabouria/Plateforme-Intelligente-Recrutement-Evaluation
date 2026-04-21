// backend/src/routes/demandeRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import {
  getDemandes,
  getDemandeById,
  createDemande,
  updateDemande,
  deleteDemande,
  submitDemande,
  validerDemande
} from '../controllers/demandeController';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes CRUD
router.route('/')
  .get(getDemandes)
  .post(createDemande);

router.route('/:id')
  .get(getDemandeById)
  .put(updateDemande)
  .delete(deleteDemande);

// Route pour soumettre une demande (brouillon → circuit)
router.post('/:id/submit', submitDemande);

// ✅ Route pour valider/refuser une demande (ajouter PATCH ou POST)
router.patch('/:id/valider', validerDemande);  // ou .post selon votre convention

export default router;