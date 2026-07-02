// backend/src/routes/publicEntretien.routes.ts
//
// A monter dans app.ts SANS le middleware d'auth JWT :
//   app.use('/api/public/entretiens', publicEntretienRoutes);

import { Router } from 'express';
import { getCreneauxPublic, reserverCreneauPublic } from '../controllers/publicEntretienController';

const router = Router();

router.get('/creneaux', getCreneauxPublic);
router.post('/reserver', reserverCreneauPublic);

export default router;