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

const router = Router();

// Toutes les routes nécessitent une authentification Super Admin
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// Gestion des circuits de validation
router.get('/circuits', getCircuits);
router.get('/circuits/:id', getCircuitById);
router.post('/circuits', createCircuit);
router.put('/circuits/:id', updateCircuit);
router.patch('/circuits/:id/toggle', toggleCircuit);
router.post('/circuits/reset', resetCircuits);
router.delete('/circuits/:id', deleteCircuit);

export default router;