"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validerDemande = exports.submitDemande = exports.deleteDemande = exports.updateDemande = exports.createDemande = exports.getDemandeById = exports.getDemandes = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const helpers_1 = require("../utils/helpers");
const circuit_service_1 = require("../services/circuit.service");
const generateReference = async () => {
    const year = new Date().getFullYear();
    const count = await prisma_1.default.demandeRecrutement.count({
        where: { reference: { startsWith: `DEM-${year}` } }
    });
    return `DEM-${year}-${String(count + 1).padStart(3, '0')}`;
};
const normalizeDecision = (decision) => {
    const value = (decision || '').toUpperCase();
    if (['VALIDE', 'VALIDEE', 'VALIDER'].includes(value))
        return 'VALIDE';
    if (['REFUSE', 'REFUSEE', 'REFUSER'].includes(value))
        return 'REFUSE';
    if (['MODIFIE', 'MODIFIEE', 'MODIFIER'].includes(value))
        return 'MODIFIE';
    return null;
};
const getDemandes = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userDirectionId = req.user.directionId;
        const { page = 1, limit = 10, statut, priorite } = req.query;
        const where = {};
        if (userRole === 'MANAGER') {
            where.managerId = userId;
        }
        else if (userRole === 'DIRECTEUR') {
            where.directionId = userDirectionId;
        }
        if (statut)
            where.statut = statut;
        if (priorite)
            where.priorite = priorite;
        const skip = (Number(page) - 1) * Number(limit);
        const [demandes, total] = await Promise.all([
            prisma_1.default.demandeRecrutement.findMany({
                where,
                include: {
                    manager: { select: { id: true, nom: true, prenom: true, email: true, directionId: true } },
                    direction: true,
                    validations: {
                        include: { acteur: { select: { id: true, nom: true, prenom: true, role: true, directionId: true } } },
                        orderBy: { niveauEtape: 'asc' }
                    },
                    disponibilites: true,
                    circuitConfig: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma_1.default.demandeRecrutement.count({ where })
        ]);
        return (0, helpers_1.sendSuccess)(res, {
            demandes,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        return (0, helpers_1.sendError)(res, 'Erreur lors de la recuperation des demandes', 500);
    }
};
exports.getDemandes = getDemandes;
const getDemandeById = async (req, res) => {
    try {
        const { id } = req.params;
        const demande = await prisma_1.default.demandeRecrutement.findUnique({
            where: { id },
            include: {
                manager: { select: { id: true, nom: true, prenom: true, email: true, directionId: true } },
                direction: true,
                validations: {
                    include: { acteur: { select: { id: true, nom: true, prenom: true, role: true, directionId: true } } },
                    orderBy: { niveauEtape: 'asc' }
                },
                disponibilites: true,
                circuitConfig: true,
                offre: true
            }
        });
        if (!demande) {
            return (0, helpers_1.sendNotFound)(res, 'Demande non trouvee');
        }
        return (0, helpers_1.sendSuccess)(res, { demande });
    }
    catch (error) {
        return (0, helpers_1.sendError)(res, 'Erreur lors de la recuperation de la demande', 500);
    }
};
exports.getDemandeById = getDemandeById;
const createDemande = async (req, res) => {
    try {
        const userId = req.user.id;
        const manager = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, directionId: true }
        });
        if (!manager || manager.role !== 'MANAGER') {
            return (0, helpers_1.sendForbidden)(res, 'Seul un manager peut creer une demande');
        }
        if (!manager.directionId) {
            return (0, helpers_1.sendError)(res, 'Le manager doit avoir une direction assignee', 400);
        }
        const { intitulePoste, justification, motif, typeContrat, priorite, budgetEstime, dateSouhaitee, description, disponibilites } = req.body;
        if (!intitulePoste || !justification || !motif || !typeContrat || !priorite || !budgetEstime || !dateSouhaitee) {
            return (0, helpers_1.sendError)(res, 'Tous les champs obligatoires doivent etre remplis', 400);
        }
        const reference = await generateReference();
        const demande = await prisma_1.default.demandeRecrutement.create({
            data: {
                reference,
                intitulePoste,
                description,
                justification,
                motif,
                typeContrat,
                priorite,
                budgetEstime: Number(budgetEstime),
                dateSouhaitee: new Date(dateSouhaitee),
                statut: 'BROUILLON',
                managerId: userId,
                directionId: manager.directionId,
                disponibilites: disponibilites
                    ? {
                        create: disponibilites.map((d) => ({
                            date: new Date(d.date),
                            heureDebut: d.heureDebut,
                            heureFin: d.heureFin
                        }))
                    }
                    : undefined
            },
            include: { disponibilites: true, direction: true }
        });
        return (0, helpers_1.sendCreated)(res, demande, 'Demande creee avec succes');
    }
    catch (error) {
        return (0, helpers_1.sendError)(res, 'Erreur lors de la creation de la demande', 500);
    }
};
exports.createDemande = createDemande;
const updateDemande = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const data = req.body;
        const demande = await prisma_1.default.demandeRecrutement.findUnique({
            where: { id }
        });
        if (!demande)
            return (0, helpers_1.sendNotFound)(res, 'Demande non trouvee');
        if (demande.managerId !== userId && userRole !== 'SUPER_ADMIN') {
            return (0, helpers_1.sendForbidden)(res, 'Vous n\'etes pas autorise a modifier cette demande');
        }
        if (demande.statut !== 'BROUILLON') {
            return (0, helpers_1.sendError)(res, 'Seules les demandes Brouillon peuvent etre modifiees', 400);
        }
        const updatedDemande = await prisma_1.default.demandeRecrutement.update({
            where: { id },
            data: {
                intitulePoste: data.intitulePoste,
                description: data.description,
                justification: data.justification,
                motif: data.motif,
                typeContrat: data.typeContrat,
                priorite: data.priorite,
                budgetEstime: data.budgetEstime ? Number(data.budgetEstime) : undefined,
                dateSouhaitee: data.dateSouhaitee ? new Date(data.dateSouhaitee) : undefined
            }
        });
        return (0, helpers_1.sendSuccess)(res, updatedDemande, 'Demande modifiee avec succes');
    }
    catch (error) {
        return (0, helpers_1.sendError)(res, 'Erreur lors de la modification', 500);
    }
};
exports.updateDemande = updateDemande;
const deleteDemande = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const demande = await prisma_1.default.demandeRecrutement.findUnique({
            where: { id }
        });
        if (!demande)
            return (0, helpers_1.sendNotFound)(res, 'Demande non trouvee');
        if (demande.managerId !== userId && userRole !== 'SUPER_ADMIN') {
            return (0, helpers_1.sendForbidden)(res, 'Vous n\'etes pas autorise a supprimer cette demande');
        }
        if (demande.statut !== 'BROUILLON') {
            return (0, helpers_1.sendError)(res, 'Seules les demandes Brouillon peuvent etre supprimees', 400);
        }
        await prisma_1.default.demandeRecrutement.delete({ where: { id } });
        return (0, helpers_1.sendSuccess)(res, null, 'Demande supprimee avec succes');
    }
    catch (error) {
        return (0, helpers_1.sendError)(res, 'Erreur lors de la suppression', 500);
    }
};
exports.deleteDemande = deleteDemande;
const submitDemande = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const demande = await prisma_1.default.demandeRecrutement.findUnique({
            where: { id },
            include: { manager: { select: { directionId: true } } }
        });
        if (!demande)
            return (0, helpers_1.sendNotFound)(res, 'Demande non trouvee');
        if (demande.managerId !== userId)
            return (0, helpers_1.sendForbidden)(res, 'Action non autorisee');
        if (demande.statut !== 'BROUILLON') {
            return (0, helpers_1.sendError)(res, 'Seules les demandes Brouillon peuvent etre soumises', 400);
        }
        if (!demande.manager.directionId) {
            return (0, helpers_1.sendError)(res, 'Le manager n\'a pas de direction assignee', 400);
        }
        await prisma_1.default.demandeRecrutement.update({
            where: { id },
            data: { directionId: demande.manager.directionId }
        });
        const circuitData = await circuit_service_1.circuitService.generateCircuit(id);
        return (0, helpers_1.sendSuccess)(res, {
            demande: {
                ...demande,
                directionId: demande.manager.directionId,
                ...circuitData
            }
        }, 'Demande soumise avec succes');
    }
    catch (error) {
        if (error?.status) {
            return (0, helpers_1.sendError)(res, error.message, error.status);
        }
        return (0, helpers_1.sendError)(res, 'Erreur lors de la soumission', 500);
    }
};
exports.submitDemande = submitDemande;
const validerDemande = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, commentaire } = req.body;
        const userId = req.user.id;
        const normalizedDecision = normalizeDecision(decision);
        if (!normalizedDecision) {
            return (0, helpers_1.sendError)(res, 'Decision invalide. Utilisez VALIDE, REFUSE ou MODIFIE', 400);
        }
        const result = await circuit_service_1.circuitService.validateStep(id, userId, normalizedDecision, commentaire);
        if (normalizedDecision === 'REFUSE') {
            return (0, helpers_1.sendSuccess)(res, { status: result.status }, 'Demande rejetee');
        }
        if (normalizedDecision === 'MODIFIE') {
            return (0, helpers_1.sendSuccess)(res, { status: result.status }, 'Demande retournee pour modification');
        }
        if (result.status === 'VALIDEE') {
            return (0, helpers_1.sendSuccess)(res, result, 'Demande validee, offre generee');
        }
        return (0, helpers_1.sendSuccess)(res, result, 'Etape validee avec succes');
    }
    catch (error) {
        if (error?.status) {
            return (0, helpers_1.sendError)(res, error.message, error.status);
        }
        return (0, helpers_1.sendError)(res, 'Erreur lors de la validation', 500);
    }
};
exports.validerDemande = validerDemande;
