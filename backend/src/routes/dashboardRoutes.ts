// backend/src/routes/dashboardRoutes.ts

import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { protect } from '../middlewares/auth';

const router = Router();

router.get('/stats', protect, getDashboardStats);

export default router;