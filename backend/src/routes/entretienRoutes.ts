// backend/src/routes/entretienRoutes.ts

import { Router } from 'express';
import {
  createEntretien,
  getEntretiens,
  getEntretienById,
  updateEntretien,
  deleteEntretien,
  getEntretiensByCandidature,
  updateEntretienStatut,
  // ✅ NOUVEAUX
  getDisponibilitesParDemande,
  addDisponibiliteInterviewer,
  updateFeedback
} from '../controllers/entretienController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// ============================================
// ROUTES STATIQUES D'ABORD
// ============================================

router.get('/statuts', protect, authorize('DRH', 'SUPER_ADMIN'), (req, res) => {
  res.json({ statuts: ['PLANIFIE', 'REALISE', 'ANNULE', 'REPORTE'] });
});

router.get('/types', protect, (req, res) => {
  res.json({
    types: [
      { value: 'RH', label: 'Entretien RH', description: 'Planifié par le DRH, date libre' },
      { value: 'TECHNIQUE', label: 'Entretien technique', description: 'Avec le manager, créneau obligatoire' },
      { value: 'DIRECTION', label: 'Entretien direction', description: 'Avec le directeur, uniquement cadres sup/stratégiques' }
    ]
  });
});

// ============================================
// DISPONIBILITÉS INTERVIEWERS
// ============================================

// Récupérer les créneaux disponibles pour une demande (DRH uniquement)
// Utilisé par PlanifierEntretienModal pour afficher les créneaux
router.get(
  '/disponibilites/:demandeId',
  protect,
  authorize('DRH', 'SUPER_ADMIN'),
  getDisponibilitesParDemande
);

// Ajouter des créneaux (MANAGER, DIRECTEUR, DRH)
// Appelé lors de la création demande, validation, ou notification séparée
router.post(
  '/disponibilites',
  protect,
  authorize('MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'),
  addDisponibiliteInterviewer
);

// ============================================
// CRUD ENTRETIENS
// ============================================

router.get('/', protect, authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'), getEntretiens);
router.post('/', protect, authorize('DRH', 'SUPER_ADMIN'), createEntretien);

// ============================================
// ROUTES AVEC PARAMÈTRES
// ============================================

router.get('/candidature/:candidatureId', protect, authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'), getEntretiensByCandidature);
router.get('/:id', protect, authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'), getEntretienById);
router.put('/:id', protect, authorize('DRH', 'SUPER_ADMIN'), updateEntretien);
router.patch('/:id/statut', protect, authorize('DRH', 'SUPER_ADMIN'), updateEntretienStatut);

// ✅ NOUVEAU : feedback par l'interviewer (MANAGER ou DIRECTEUR)
router.patch(
  '/:id/feedback',
  protect,
  authorize('MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'),
  updateFeedback
);

router.delete('/:id', protect, authorize('DRH', 'SUPER_ADMIN'), deleteEntretien);

export default router;