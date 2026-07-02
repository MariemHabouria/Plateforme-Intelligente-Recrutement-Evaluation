// backend/src/routes/adminRoutes.ts

import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import {
  getCircuits,
  getCircuitById,
  updateCircuit,
  createCircuit,
  toggleCircuit,
  resetCircuits,
  deleteCircuit
} from '../controllers/circuitConfigController';
import {
  getScoringConfig,
  updateScoringConfig
} from '../controllers/scoringConfigController'; 

const router = Router();

router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// Circuits de validation
router.get('/circuits', getCircuits);
router.get('/circuits/:id', getCircuitById);
router.post('/circuits', createCircuit);
router.put('/circuits/:id', updateCircuit);
router.patch('/circuits/:id/toggle', toggleCircuit);
router.post('/circuits/reset', resetCircuits);
router.delete('/circuits/:id', deleteCircuit);

//  Scoring config
router.get('/scoring-config', getScoringConfig);
router.put('/scoring-config', updateScoringConfig);

export default router;