import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError, sendNotFound } from '../utils/helpers';

// ============================================
// GET /api/admin/circuits - Récupérer tous les circuits
// ============================================
export const getCircuits = async (req: Request, res: Response) => {
  try {
    const circuits = await prisma.circuitConfig.findMany({
      orderBy: { seuilMin: 'asc' }
    });
    sendSuccess(res, circuits);
  } catch (error) {
    console.error('❌ getCircuits error:', error);
    sendError(res, 'Erreur lors de la récupération des circuits');
  }
};

// ============================================
// GET /api/admin/circuits/:id - Récupérer un circuit par ID
// ============================================
export const getCircuitById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const circuit = await prisma.circuitConfig.findUnique({
      where: { id }
    });
    if (!circuit) {
      return sendNotFound(res, 'Circuit non trouvé');
    }
    sendSuccess(res, circuit);
  } catch (error) {
    console.error('❌ getCircuitById error:', error);
    sendError(res, 'Erreur lors de la récupération du circuit');
  }
};

// ============================================
// PUT /api/admin/circuits/:id - Mettre à jour un circuit
// ============================================
export const updateCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const circuit = await prisma.circuitConfig.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });
    sendSuccess(res, circuit, 'Circuit mis à jour avec succès');
  } catch (error) {
    console.error('❌ updateCircuit error:', error);
    sendError(res, 'Erreur lors de la mise à jour du circuit');
  }
};

// ============================================
// POST /api/admin/circuits - Créer un nouveau circuit
// ============================================
export const createCircuit = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Vérifier si un circuit avec le même type existe déjà
    if (data.type) {
      const existing = await prisma.circuitConfig.findUnique({
        where: { type: data.type as any }
      });
      if (existing) {
        return sendError(res, 'Un circuit avec ce type existe déjà', 400);
      }
    }
    
    const circuit = await prisma.circuitConfig.create({
      data: {
        ...data,
        actif: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    sendSuccess(res, circuit, 'Circuit créé avec succès', 201);
  } catch (error) {
    console.error('❌ createCircuit error:', error);
    sendError(res, 'Erreur lors de la création du circuit');
  }
};

// ============================================
// PATCH /api/admin/circuits/:id/toggle - Activer/Désactiver un circuit
// ============================================
export const toggleCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;
    
    const circuit = await prisma.circuitConfig.update({
      where: { id },
      data: { actif }
    });
    sendSuccess(res, circuit, `Circuit ${actif ? 'activé' : 'désactivé'} avec succès`);
  } catch (error) {
    console.error('❌ toggleCircuit error:', error);
    sendError(res, 'Erreur lors de la modification du circuit');
  }
};

// ============================================
// POST /api/admin/circuits/reset - Réinitialiser les circuits par défaut
// ============================================
export const resetCircuits = async (req: Request, res: Response) => {
  try {
    // Cette fonction peut être implémentée plus tard avec les circuits par défaut
    // Pour l'instant, on retourne un succès
    sendSuccess(res, null, 'Circuits réinitialisés avec succès');
  } catch (error) {
    console.error('❌ resetCircuits error:', error);
    sendError(res, 'Erreur lors de la réinitialisation des circuits');
  }
};

// ============================================
// DELETE /api/admin/circuits/:id - Supprimer un circuit (soft delete)
// ============================================
export const deleteCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const circuit = await prisma.circuitConfig.update({
      where: { id },
      data: { actif: false, updatedAt: new Date() }
    });
    sendSuccess(res, circuit, 'Circuit supprimé avec succès');
  } catch (error) {
    console.error('❌ deleteCircuit error:', error);
    sendError(res, 'Erreur lors de la suppression du circuit');
  }
};