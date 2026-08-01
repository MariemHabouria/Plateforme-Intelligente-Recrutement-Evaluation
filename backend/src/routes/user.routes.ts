import { Router } from 'express';
import { 
  protect, 
  authorize 
} from '../middlewares/auth';

import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resendInvite,
  resetPassword,
  updateOwnProfile,
  getCurrentUser,
  getUserByRole,
  getUserByRoleAndDirection
} from '../controllers/user.controller';

const router = Router();


// ==================================================
// ROUTES INTERNES N8N
// ⚠️ AVANT router.use(protect)
// ==================================================

router.get(
  '/by-role/:role',
  getUserByRole
);

router.get(
  '/by-role/:role/direction/:directionId',
  getUserByRoleAndDirection
);


// ==================================================
// ROUTES UTILISATEUR CONNECTÉ (JWT)
// ==================================================

router.use(protect);


// Profil personnel
router.get(
  '/me',
  getCurrentUser
);

router.put(
  '/me',
  updateOwnProfile
);


// ==================================================
// ADMINISTRATION UTILISATEURS
// ==================================================

router.get(
  '/',
  authorize('SUPER_ADMIN', 'DRH'),
  getUsers
);


router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'DRH'),
  getUserById
);


router.put(
  '/:id',
  authorize('SUPER_ADMIN'),
  updateUser
);


router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  deleteUser
);


router.patch(
  '/:id/toggle-status',
  authorize('SUPER_ADMIN'),
  toggleUserStatus
);


router.post(
  '/:id/resend-invite',
  authorize('SUPER_ADMIN'),
  resendInvite
);


router.post(
  '/:id/reset-password',
  authorize('SUPER_ADMIN'),
  resetPassword
);


export default router;