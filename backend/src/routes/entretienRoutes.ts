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

  getDisponibilitesParDemande,
  addDisponibiliteInterviewer,
  updateFeedback,
  getMesDisponibilites,
  deleteDisponibiliteInterviewer,getOffresPourFiltre
} from '../controllers/entretienController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();


// ROUTES STATIQUES 


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


// DISPONIBILITÉS INTERVIEWERS


//  IMPORTANT : routes a segment fixe AVANT les routes /disponibilites/:xxx
// et avant /:id plus bas, sinon Express les fait matcher par le mauvais handler.

// Mes propres disponibilités (DRH, MANAGER, DIRECTEUR — interviewer connecté)
router.get(
  '/mes-disponibilites',
  protect,
  authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'),
  getMesDisponibilites
);

// Supprimer une disponibilité (proprietaire ou SUPER_ADMIN, verifie dans le controller)
router.delete(
  '/disponibilites/:id',
  protect,
  authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'),
  deleteDisponibiliteInterviewer
);

// Récupérer les créneaux disponibles pour une demande (DRH uniquement)
router.get(
  '/disponibilites/:demandeId',
  protect,
  authorize('DRH', 'SUPER_ADMIN'),
  getDisponibilitesParDemande
);

// Ajouter des créneaux (MANAGER, DIRECTEUR, DRH)
router.post(
  '/disponibilites',
  protect,
  authorize('MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'),
  addDisponibiliteInterviewer
);


// CRUD ENTRETIENS


router.get('/', protect, authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'), getEntretiens);
router.post('/', protect, authorize('DRH', 'SUPER_ADMIN'), createEntretien);
router.get('/offres-filtre', protect, authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'), getOffresPourFiltre);

// ROUTES AVEC PARAMÈTRES


router.get('/candidature/:candidatureId', protect, authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'), getEntretiensByCandidature);
router.get('/:id', protect, authorize('DRH', 'MANAGER', 'DIRECTEUR', 'SUPER_ADMIN'), getEntretienById);
router.put('/:id', protect, authorize('DRH', 'SUPER_ADMIN'), updateEntretien);
router.patch('/:id/statut', protect, authorize('DRH', 'SUPER_ADMIN'), updateEntretienStatut);

router.patch(
  '/:id/feedback',
  protect,
  authorize('MANAGER', 'DIRECTEUR', 'DRH', 'SUPER_ADMIN'),
  updateFeedback
);

router.delete('/:id', protect, authorize('DRH', 'SUPER_ADMIN'), deleteEntretien);

export default router;