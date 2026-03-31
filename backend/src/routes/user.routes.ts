import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  resendInvite,
  resetPassword
} from '../controllers/user.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

router.use(protect);
router.use(authorize('SUPER_ADMIN'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);


router.patch('/:id/toggle-status', toggleUserStatus);
router.post('/:id/resend-invite', resendInvite);
router.post('/:id/reset-password', resetPassword);


router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;