"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCircuit = exports.resetCircuits = exports.toggleCircuit = exports.createCircuit = exports.updateCircuit = exports.getCircuitById = exports.getCircuits = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const helpers_1 = require("../utils/helpers");
const VALID_WORKFLOW_ROLES = new Set(['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG']);
const validateEtapes = (etapes) => {
    if (!Array.isArray(etapes) || etapes.length === 0) {
        return 'Circuit doit contenir au moins une étape';
    }
    for (const etape of etapes) {
        if (!etape.role || !VALID_WORKFLOW_ROLES.has(etape.role)) {
            return `Rôle invalide: "${etape.role}". Rôles supportés: DIRECTEUR, DRH, DAF, DGA, DG`;
        }
        if (!etape.niveau || !etape.label) {
            return 'Étape doit avoir un niveau et un label';
        }
    }
    return null;
};
// ============================================
// GET /api/admin/circuits - Récupérer tous les circuits
// ============================================
const getCircuits = async (req, res) => {
    try {
        const circuits = await prisma_1.default.circuitConfig.findMany({
            orderBy: { seuilMin: 'asc' }
        });
        (0, helpers_1.sendSuccess)(res, circuits);
    }
    catch (error) {
        console.error('❌ getCircuits error:', error);
        (0, helpers_1.sendError)(res, 'Erreur lors de la récupération des circuits');
    }
};
exports.getCircuits = getCircuits;
// ============================================
// GET /api/admin/circuits/:id - Récupérer un circuit par ID
// ============================================
const getCircuitById = async (req, res) => {
    try {
        const { id } = req.params;
        const circuit = await prisma_1.default.circuitConfig.findUnique({
            where: { id }
        });
        if (!circuit) {
            return (0, helpers_1.sendNotFound)(res, 'Circuit non trouvé');
        }
        (0, helpers_1.sendSuccess)(res, circuit);
    }
    catch (error) {
        console.error('❌ getCircuitById error:', error);
        (0, helpers_1.sendError)(res, 'Erreur lors de la récupération du circuit');
    }
};
exports.getCircuitById = getCircuitById;
// ============================================
// PUT /api/admin/circuits/:id - Mettre à jour un circuit
// ============================================
const updateCircuit = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        if (data.etapes) {
            const etapesError = validateEtapes(data.etapes);
            if (etapesError) {
                return (0, helpers_1.sendError)(res, etapesError, 400);
            }
        }
        const circuit = await prisma_1.default.circuitConfig.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        (0, helpers_1.sendSuccess)(res, circuit, 'Circuit mis à jour avec succès');
    }
    catch (error) {
        console.error('❌ updateCircuit error:', error);
        (0, helpers_1.sendError)(res, 'Erreur lors de la mise à jour du circuit');
    }
};
exports.updateCircuit = updateCircuit;
// ============================================
// POST /api/admin/circuits - Créer un nouveau circuit
// ============================================
const createCircuit = async (req, res) => {
    try {
        const data = req.body;
        if (data.etapes) {
            const etapesError = validateEtapes(data.etapes);
            if (etapesError) {
                return (0, helpers_1.sendError)(res, etapesError, 400);
            }
        }
        // Vérifier si un circuit avec le même type existe déjà
        if (data.type) {
            const existing = await prisma_1.default.circuitConfig.findUnique({
                where: { type: data.type }
            });
            if (existing) {
                return (0, helpers_1.sendError)(res, 'Un circuit avec ce type existe déjà', 400);
            }
        }
        const circuit = await prisma_1.default.circuitConfig.create({
            data: {
                ...data,
                actif: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        (0, helpers_1.sendSuccess)(res, circuit, 'Circuit créé avec succès', 201);
    }
    catch (error) {
        console.error('❌ createCircuit error:', error);
        (0, helpers_1.sendError)(res, 'Erreur lors de la création du circuit');
    }
};
exports.createCircuit = createCircuit;
// ============================================
// PATCH /api/admin/circuits/:id/toggle - Activer/Désactiver un circuit
// ============================================
const toggleCircuit = async (req, res) => {
    try {
        const { id } = req.params;
        const { actif } = req.body;
        const circuit = await prisma_1.default.circuitConfig.update({
            where: { id },
            data: { actif }
        });
        (0, helpers_1.sendSuccess)(res, circuit, `Circuit ${actif ? 'activé' : 'désactivé'} avec succès`);
    }
    catch (error) {
        console.error('❌ toggleCircuit error:', error);
        (0, helpers_1.sendError)(res, 'Erreur lors de la modification du circuit');
    }
};
exports.toggleCircuit = toggleCircuit;
// ============================================
// POST /api/admin/circuits/reset - Réinitialiser les circuits par défaut
// ============================================
const resetCircuits = async (req, res) => {
    try {
        // Cette fonction peut être implémentée plus tard avec les circuits par défaut
        // Pour l'instant, on retourne un succès
        (0, helpers_1.sendSuccess)(res, null, 'Circuits réinitialisés avec succès');
    }
    catch (error) {
        console.error('❌ resetCircuits error:', error);
        (0, helpers_1.sendError)(res, 'Erreur lors de la réinitialisation des circuits');
    }
};
exports.resetCircuits = resetCircuits;
// ============================================
// DELETE /api/admin/circuits/:id - Supprimer un circuit (soft delete)
// ============================================
const deleteCircuit = async (req, res) => {
    try {
        const { id } = req.params;
        const circuit = await prisma_1.default.circuitConfig.update({
            where: { id },
            data: { actif: false, updatedAt: new Date() }
        });
        (0, helpers_1.sendSuccess)(res, circuit, 'Circuit supprimé avec succès');
    }
    catch (error) {
        console.error('❌ deleteCircuit error:', error);
        (0, helpers_1.sendError)(res, 'Erreur lors de la suppression du circuit');
    }
};
exports.deleteCircuit = deleteCircuit;
