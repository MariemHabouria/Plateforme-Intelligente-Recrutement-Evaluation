// backend/src/controllers/circuitController.ts

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { sendSuccess, sendError, sendNotFound } from '../utils/helpers';
import { CircuitType } from '@prisma/client';

const VALID_WORKFLOW_ROLES = new Set(['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG']);

const validateEtapes = (etapes: any[]): null | string => {
  if (!Array.isArray(etapes) || etapes.length === 0) {
    return 'Circuit doit contenir au moins une etape';
  }
  for (const etape of etapes) {
    if (!etape.role || !VALID_WORKFLOW_ROLES.has(etape.role)) {
      return `Role invalide: "${etape.role}". Roles supportes: DIRECTEUR, DRH, DAF, DGA, DG`;
    }
    if (!etape.niveau || !etape.label) {
      return 'Etape doit avoir un niveau et un label';
    }
  }
  return null;
};

export const getCircuits = async (req: Request, res: Response) => {
  try {
    const circuits = await prisma.circuitConfig.findMany({
      orderBy: { nom: 'asc' },
      where: { actif: true }
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

export const getCircuitByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const circuit = await prisma.circuitConfig.findFirst({
      where: { type: type as any, actif: true }
    });
    if (!circuit) return sendNotFound(res, 'Circuit non trouve pour ce type');
    sendSuccess(res, circuit);
  } catch (error) {
    console.error('getCircuitByType error:', error);
    sendError(res, 'Erreur lors de la recuperation du circuit');
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
      data: { ...data, updatedAt: new Date() }
    });
    sendSuccess(res, circuit, 'Circuit mis a jour avec succes');
  } catch (error) {
    console.error('updateCircuit error:', error);
    sendError(res, 'Erreur lors de la mise a jour du circuit');
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
        totalEtapes: data.totalEtapes,
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

export const toggleCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;

    const circuit = await prisma.circuitConfig.update({
      where: { id },
      data: { actif, updatedAt: new Date() }
    });
    sendSuccess(res, circuit, `Circuit ${actif ? 'active' : 'desactive'} avec succes`);
  } catch (error) {
    console.error('toggleCircuit error:', error);
    sendError(res, 'Erreur lors de la modification du circuit');
  }
};

export const resetCircuits = async (req: Request, res: Response) => {
  try {
    const defaultCircuits = [
      {
        type: CircuitType.TECHNICIEN,
        nom: 'Technicien / Ouvrier',
        description: 'Postes techniques et ouvriers',
        etapes: [
          { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
        ],
        totalEtapes: 2, delaiParDefaut: 48, actif: true
      },
      {
        type: CircuitType.EMPLOYE,
        nom: 'Employe / Agent',
        description: 'Postes administratifs',
        etapes: [
          { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 }
        ],
        totalEtapes: 2, delaiParDefaut: 48, actif: true
      },
      {
        type: CircuitType.CADRE_DEBUTANT,
        nom: 'Cadre debutant',
        description: 'Cadres juniors',
        etapes: [
          { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
          { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 }
        ],
        totalEtapes: 3, delaiParDefaut: 48, actif: true
      },
      {
        type: CircuitType.CADRE_CONFIRME,
        nom: 'Cadre confirme',
        description: 'Cadres seniors',
        etapes: [
          { niveau: 1, role: 'DIRECTEUR', label: 'Directeur', delai: 48 },
          { niveau: 2, role: 'DRH', label: 'DRH', delai: 48 },
          { niveau: 3, role: 'DAF', label: 'DAF', delai: 48 },
          { niveau: 4, role: 'DGA', label: 'DGA', delai: 48 }
        ],
        totalEtapes: 4, delaiParDefaut: 48, actif: true
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
        totalEtapes: 5, delaiParDefaut: 48, actif: true
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
        totalEtapes: 5, delaiParDefaut: 48, actif: true
      }
    ];

    await prisma.circuitConfig.updateMany({ where: {}, data: { actif: false } });

    let created = 0;
    for (const circuit of defaultCircuits) {
      await prisma.circuitConfig.upsert({
        where: { type: circuit.type },
        update: {
          nom: circuit.nom, description: circuit.description,
          etapes: circuit.etapes, totalEtapes: circuit.totalEtapes,
          delaiParDefaut: circuit.delaiParDefaut, actif: true,
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

export const deleteCircuit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const circuit = await prisma.circuitConfig.update({
      where: { id },
      data: { actif: false, updatedAt: new Date() }
    });
    sendSuccess(res, circuit, 'Circuit supprime avec succes');
  } catch (error) {
    console.error('deleteCircuit error:', error);
    sendError(res, 'Erreur lors de la suppression du circuit');
  }
};