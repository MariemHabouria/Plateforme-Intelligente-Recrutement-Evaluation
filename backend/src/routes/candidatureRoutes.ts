// backend/src/routes/candidatureRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import {
  soumettreCandidature,
  getCandidatures,
  getCandidatureById,
  updateCandidatureStatut,
  deleteCandidature,
  getCandidaturesAcceptees,
  getCandidaturesAccepteesSansContrat,
  getOffreByToken,
  uploadCV,
  envoyerFicheRenseignement,
  getFicheRenseignement,
  soumettreFicheRenseignement,
  getFicheByCandidatureId
} from '../controllers/candidatureController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Routes publiques (sans authentification)
router.get('/offre/:token', getOffreByToken);
router.post('/public/:token', soumettreCandidature);
router.post('/upload/cv', upload.single('cv'), uploadCV);

// Routes pour la fiche de renseignement (public)
router.get('/fiche-renseignement/:token', getFicheRenseignement);
router.post('/fiche-renseignement/:token/soumettre', soumettreFicheRenseignement);

// Routes protégées
router.get('/', protect, authorize('DRH', 'SUPER_ADMIN', 'MANAGER', 'RESP_PAIE'), getCandidatures);
router.get('/acceptees', protect, authorize('RESP_PAIE', 'SUPER_ADMIN'), getCandidaturesAcceptees);
router.get('/acceptees/sans-contrat', protect, authorize('RESP_PAIE', 'SUPER_ADMIN'), getCandidaturesAccepteesSansContrat);
router.get('/:id', protect, authorize('DRH', 'SUPER_ADMIN', 'MANAGER', 'RESP_PAIE'), getCandidatureById);
router.patch('/:id/statut', protect, authorize('DRH', 'SUPER_ADMIN'), updateCandidatureStatut);
router.delete('/:id', protect, authorize('DRH', 'SUPER_ADMIN'), deleteCandidature);
router.post('/:candidatureId/envoyer-fiche', protect, authorize('DRH', 'SUPER_ADMIN'), envoyerFicheRenseignement);
router.get('/:id/fiche', protect, authorize('DRH', 'SUPER_ADMIN'), getFicheByCandidatureId);
export default router;