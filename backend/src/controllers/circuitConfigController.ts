// backend/src/controllers/circuitConfigController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError, sendNotFound } from '../utils/helpers';
import { CircuitType } from '@prisma/client';

const VALID_WORKFLOW_ROLES = new Set(['MANAGER', 'DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG']);

const validateEtapes = (etapes: any[]): null | string => {
  if (!Array.isArray(etapes) || etapes.length === 0) {
    return 'Le circuit doit contenir au moins une etape';
  }
  for (const etape of etapes) {
    if (!etape.role || !VALID_WORKFLOW_ROLES.has(etape.role)) {
      return `Role invalide: "${etape.role}". Roles supportes: MANAGER, DIRECTEUR, DRH, DAF, DGA, DG`;
    }
    if (!etape.niveau || !etape.label) {
      return 'Chaque etape doit avoir un niveau et un label';
    }
    if (!etape.delai || etape.delai < 1) {
      return 'Chaque etape doit avoir un delai valide (minimum 1 heure)';
    }
  }
  return null;
};

export const getCircuits = async (req: Request, res: Response) => {
  try {
    const circuits = await prisma.circuitConfig.findMany({
      orderBy: { nom: 'asc' }
    });
    sendSuccess(res, circuits);
  } catch (error) {
    console.error('getCircuits error:', error);
    sendError(res, 'Erreur lors de la recuperation des circuits');
  }
};

export const getCircuitById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const circuit = await prisma.circuitConfig.findUnique({ where: { id } });
    if (!circuit) return sendNotFound(res, 'Circuit non trouve');
    sendSuccess(res, circuit);
  } catch (error) {
    console.error('getCircuitById error:', error);
    sendError(res, 'Erreur lors de la recuperation du circuit');
  }
};

export const createCircuit = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (data.etapes) {
      const etapesError = validateEtapes(data.etapes);
      if (etapesError) return sendError(res, etapesError, 400);
    }

    if (data.type) {
      const existing = await prisma.circuitConfig.findUnique({ where: { type: data.type as any } });
      if (existing) return sendError(res, 'Un circuit avec ce type existe deja', 400);
    }

    const circuit = await prisma.circuitConfig.create({
      data: {
        type: data.type,
        nom: data.nom,
        description: data.description,
        etapes: data.etapes,
        totalEtapes: data.totalEtapes || data.etapes.length,
        delaiParDefaut: data.delaiParDefaut || 48,
        actif: data.actif !== undefined ? data.actif : true
      }
    });
    sendSuccess(res, circuit, 'Circuit cree avec succes', 201);
  } catch (error) {
    console.error('createCircuit error:', error);
    sendError(res, 'Erreur lors de la creation du circuit');
  }
};

export const updateCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.etapes) {
      const etapesError = validateEtapes(data.etapes);
      if (etapesError) return sendError(res, etapesError, 400);
    }

    const circuit = await prisma.circuitConfig.update({
      where: { id },
      data: {
        nom: data.nom,
        description: data.description,
        etapes: data.etapes,
        totalEtapes: data.totalEtapes || data.etapes?.length,
        delaiParDefaut: data.delaiParDefaut,
        updatedAt: new Date()
      }
    });
    sendSuccess(res, circuit, 'Circuit mis a jour avec succes');
  } catch (error) {
    console.error('updateCircuit error:', error);
    sendError(res, 'Erreur lors de la mise a jour du circuit');
  }
};

// Activer/Desactiver un circuit (soft delete)
export const toggleCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;

    const circuit = await prisma.circuitConfig.findUnique({ where: { id } });
    if (!circuit) return sendNotFound(res, 'Circuit non trouve');

    const updatedCircuit = await prisma.circuitConfig.update({
      where: { id },
      data: { 
        actif: actif !== undefined ? actif : !circuit.actif,
        updatedAt: new Date() 
      }
    });
    sendSuccess(res, updatedCircuit, `Circuit ${updatedCircuit.actif ? 'active' : 'desactive'} avec succes`);
  } catch (error) {
    console.error('toggleCircuit error:', error);
    sendError(res, 'Erreur lors de la modification du circuit');
  }
};

export const deleteCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const circuit = await prisma.circuitConfig.findUnique({ where: { id } });
    if (!circuit) return sendNotFound(res, 'Circuit non trouve');
    
    // Vérifier si le circuit est utilisé par des demandes
    const demandesCount = await prisma.demandeRecrutement.count({
      where: { circuitConfigId: id }
    });
    
    if (demandesCount > 0) {
      return sendError(res, 'Ce circuit est utilise par des demandes existantes. Desactivez-le plutot que de le supprimer.', 400);
    }
    
    await prisma.circuitConfig.delete({ where: { id } });
    sendSuccess(res, null, 'Circuit supprime avec succes');
  } catch (error) {
    console.error('deleteCircuit error:', error);
    sendError(res, 'Erreur lors de la suppression du circuit');
  }
};

// Reinitialiser les circuits par defaut
export const resetCircuits = async (req: Request, res: Response) => {
  try {
    const defaultCircuits = [
      {
        type: CircuitType.TECHNICIEN,
        nom: 'Technicien / Ouvrier',
        description: 'Postes techniques et ouvriers',
        etapes: [
          { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
          { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 }
        ],
        totalEtapes: 3,
        delaiParDefaut: 48,
        actif: true
      },
      {
        type: CircuitType.EMPLOYE,
        nom: 'Employe / Agent',
        description: 'Postes administratifs',
        etapes: [
          { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
          { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 }
        ],
        totalEtapes: 3,
        delaiParDefaut: 48,
        actif: true
      },
      {
        type: CircuitType.CADRE_DEBUTANT,
        nom: 'Cadre debutant',
        description: 'Cadres juniors (1-3 ans experience)',
        etapes: [
          { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
          { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 },
          { niveau: 4, role: 'DAF', label: 'DAF', delai: 48 }
        ],
        totalEtapes: 4,
        delaiParDefaut: 48,
        actif: true
      },
      {
        type: CircuitType.CADRE_CONFIRME,
        nom: 'Cadre confirme',
        description: 'Cadres seniors (4-8 ans experience)',
        etapes: [
          { niveau: 1, role: 'MANAGER', label: 'Manager', delai: 48 },
          { niveau: 2, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 3, role: 'DRH', label: 'DRH', delai: 48 },
          { niveau: 4, role: 'DAF', label: 'DAF', delai: 48 },
          { niveau: 5, role: 'DGA', label: 'DGA', delai: 48 }
        ],
        totalEtapes: 5,
        delaiParDefaut: 48,
        actif: true
      },
      {
        type: CircuitType.CADRE_SUPERIEUR,
        nom: 'Cadre superieur',
        description: 'Directeurs de departement',
        etapes: [
          { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
          { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
          { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
          { niveau: 5, role: 'DG', label: 'DG', delai: 48 }
        ],
        totalEtapes: 5,
        delaiParDefaut: 48,
        actif: true
      },
      {
        type: CircuitType.STRATEGIQUE,
        nom: 'Poste strategique',
        description: 'Postes de direction generale',
        etapes: [
          { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
          { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
          { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 },
          { niveau: 5, role: 'DG', label: 'DG', delai: 48 }
        ],
        totalEtapes: 5,
        delaiParDefaut: 48,
        actif: true
      }
    ];

    // Desactiver tous les circuits existants
    await prisma.circuitConfig.updateMany({
      where: {},
      data: { actif: false }
    });

    // Upsert les circuits par defaut
    let created = 0;
    for (const circuit of defaultCircuits) {
      await prisma.circuitConfig.upsert({
        where: { type: circuit.type },
        update: {
          nom: circuit.nom,
          description: circuit.description,
          etapes: circuit.etapes,
          totalEtapes: circuit.totalEtapes,
          delaiParDefaut: circuit.delaiParDefaut,
          actif: true,
          updatedAt: new Date()
        },
        create: circuit
      });
      created++;
    }

    sendSuccess(res, { created }, `${created} circuits reinitialises avec succes`);
  } catch (error) {
    console.error('resetCircuits error:', error);
    sendError(res, 'Erreur lors de la reinitialisation des circuits');
  }
};