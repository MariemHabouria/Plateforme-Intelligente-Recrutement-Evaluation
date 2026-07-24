import { Router } from 'express';
import { protect, authorize, verifierTokenValidation, protectOrToken } from '../middlewares/auth';
import { validationRateLimit } from '../middlewares/rateLimiter';
import {
  getDemandes,
  getDemandeById,
  createDemande,
  updateDemande,
  deleteDemande,
  submitDemande,
  validerDemande,
  getDemandeForN8n,
  updateDemandeStatutN8n,
  checkRelance,
  relancerManuellement
} from '../controllers/demandeController';

const router = Router();

// ── Routes internes n8n (AVANT protect — pas de JWT) ──────────────────
router.get('/internal/:id', getDemandeForN8n);
router.patch('/internal/:id/statut', updateDemandeStatutN8n);
router.post('/internal/:id/check-relance', checkRelance);

// ── Route publique avec token de validation ─────────────────────────────
router.get('/validation/:id', validationRateLimit, verifierTokenValidation, getDemandeById);

// ── Route avec authentification OU token ───────────────────────────────
router.get('/secure/:id', validationRateLimit, protectOrToken, getDemandeById);

// ── Toutes les routes suivantes nécessitent un JWT valide ─────────────
router.use(protect);

// CRUD standard
router.get('/', getDemandes);
router.post('/', createDemande);

router.get('/:id', getDemandeById);
router.put('/:id', updateDemande); 
router.delete('/:id', deleteDemande);

// Circuit de validation
router.post('/:id/submit', submitDemande);
router.post('/:id/relancer', authorize('DRH', 'SUPER_ADMIN'), relancerManuellement); 

router.patch('/:id/valider', verifierTokenValidation, validerDemande);

export default router;