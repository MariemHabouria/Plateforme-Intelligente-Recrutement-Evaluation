import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  updateOwnProfile,  // ← NOUVEAU : importer la fonction
  toggleUserStatus,
  deleteUser,
  resendInvite,
  resetPassword,
} from '../controllers/user.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// ===== ROUTE PUBLIQUE (mais authentifiée) =====
// N'importe quel utilisateur connecté peut modifier son propre profil
router.patch('/profile', protect, updateOwnProfile);  // ← NOUVELLE ROUTE

// ===== ROUTES SUPER ADMIN UNIQUEMENT =====
// Toutes les routes après ce middleware sont réservées au Super Admin
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.delete('/:id', deleteUser);
router.post('/:id/resend-invite', resendInvite);
router.post('/:id/reset-password', resetPassword);

export default router;