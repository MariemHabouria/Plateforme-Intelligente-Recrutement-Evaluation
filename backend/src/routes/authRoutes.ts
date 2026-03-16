import { Router } from 'express';
import { login, changePassword, getMe, register } from '../controllers/authController';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Routes publiques
router.post('/login', login);

// Routes protégées
router.patch('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

// Route Super Admin uniquement
router.post('/register', protect, authorize('SUPER_ADMIN'), register);

export default router;