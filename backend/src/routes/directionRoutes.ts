import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import prisma from '../config/prisma';

const router = Router();

router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// GET /api/directions
router.get('/', async (req, res) => {
  try {
    const directions = await prisma.direction.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' }
    });
    res.json({ success: true, data: directions });
  } catch (error) {
    console.error('❌ getDirections error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;