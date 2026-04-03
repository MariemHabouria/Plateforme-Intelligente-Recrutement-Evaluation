import { Router } from 'express';
import { protect } from '../middlewares/auth';
import prisma from '../config/prisma';

const router = Router();

router.use(protect);

// GET /api/type-postes?directionId=xxx
router.get('/', async (req, res) => {
  try {
    const { directionId } = req.query;
    const where: any = { actif: true };
    
    if (directionId) {
      where.directionId = directionId as string;
    }
    
    const typesPoste = await prisma.typePoste.findMany({
      where,
      orderBy: { nom: 'asc' }
    });
    
    res.json({ success: true, data: typesPoste });
  } catch (error) {
    console.error('❌ getTypePostes error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
router.post('/', async (req, res) => {
  try {
    const { code, nom, description, circuitType, directionId } = req.body;

    if (!code || !nom || !circuitType || !directionId) {
      return res.status(400).json({ success: false, message: 'Code, nom, circuit et direction sont requis' });
    }

    const typePoste = await prisma.typePoste.create({
      data: {
        code,
        nom,
        description,
        circuitType,
        directionId
      },
      include: { direction: true }
    });

    res.status(201).json({ success: true, data: typePoste });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Ce code existe déjà' });
    }
    console.error('❌ createTypePoste error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/type-postes/:id
router.put('/:id', async (req, res) => {
  try {
    const { nom, description, circuitType } = req.body;

    const typePoste = await prisma.typePoste.update({
      where: { id: req.params.id },
      data: { nom, description, circuitType },
      include: { direction: true }
    });

    res.json({ success: true, data: typePoste });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Type de poste introuvable' });
    }
    console.error('❌ updateTypePoste error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/type-postes/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.typePoste.update({
      where: { id: req.params.id },
      data: { actif: false }  // soft delete
    });

    res.json({ success: true, message: 'Type de poste supprimé' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Type de poste introuvable' });
    }
    console.error('❌ deleteTypePoste error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
export default router;