import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  updateOwnProfile,
  toggleUserStatus,
  deleteUser,
  resendInvite,
  resetPassword,
  getCurrentUser,
  getUserByRole,
  getUserByRoleAndDirection,
} from '../controllers/user.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// n8n internal route - BEFORE protect middleware
router.get('/by-role/:role', getUserByRole);
router.get('/by-role-direction/:role/:directionId', getUserByRoleAndDirection);
// protect applies to everything below
router.use(protect);

// Routes accessible to ALL connected users
router.get('/profile', getCurrentUser);
router.patch('/profile', updateOwnProfile);

// Routes reserved for SUPER_ADMIN only
router.use(authorize('SUPER_ADMIN'));
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.patch('/:id', updateUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.post('/:id/resend-invite', resendInvite);
router.post('/:id/reset-password', resetPassword);
router.delete('/:id', deleteUser);

export default router;