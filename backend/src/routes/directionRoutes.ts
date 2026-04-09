import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import prisma from '../config/prisma';

const router = Router();

router.use(protect);

// GET /api/directions
// Accessible à tous les rôles qui peuvent créer des demandes
router.get(
  '/',
  authorize('SUPER_ADMIN', 'DRH', 'DAF', 'DGA', 'DG', 'DIRECTEUR', 'MANAGER'),
  async (req, res) => {
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
  }
);

export default router;