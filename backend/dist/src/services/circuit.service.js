"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const constants_1 = require("../config/constants");
class CircuitError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
const addHours = (hours) => {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
};
const mapStatusByRole = (role) => {
    return constants_1.STATUT_PAR_ROLE[role] || 'EN_VALIDATION_DIR';
};
const findCircuitByBudget = async (budget) => {
    const circuits = await prisma_1.default.circuitConfig.findMany({
        where: { actif: true },
        orderBy: { seuilMin: 'asc' }
    });
    if (!circuits.length) {
        throw new CircuitError('Aucun circuit de validation actif', 500);
    }
    for (const circuit of circuits) {
        const min = circuit.seuilMin ?? 0;
        const max = circuit.seuilMax ?? Number.POSITIVE_INFINITY;
        if (budget >= min && budget < max) {
            return circuit;
        }
    }
    return circuits[circuits.length - 1];
};
const findValidatorForRole = async (role, directionId) => {
    if (role === 'DIRECTEUR') {
        return prisma_1.default.user.findFirst({
            where: {
                role: 'DIRECTEUR',
                directionId,
                actif: true
            }
        });
    }
    return prisma_1.default.user.findFirst({
        where: {
            role: role,
            actif: true
        }
    });
};
const createOfferFromDemande = async (demande, fallbackRhId) => {
    const rhUser = await prisma_1.default.user.findFirst({
        where: { role: 'DRH', actif: true },
        select: { id: true }
    });
    const offreCount = await prisma_1.default.offreEmploi.count();
    return prisma_1.default.offreEmploi.create({
        data: {
            reference: `OFF-${new Date().getFullYear()}-${String(offreCount + 1).padStart(3, '0')}`,
            intitule: demande.intitulePoste,
            description: demande.description || undefined,
            typeContrat: demande.typeContrat,
            statut: 'BROUILLON',
            rhId: rhUser?.id || fallbackRhId,
            demandeId: demande.id
        }
    });
};
exports.circuitService = {
    async generateCircuit(demandeId) {
        const demande = await prisma_1.default.demandeRecrutement.findUnique({
            where: { id: demandeId },
            include: {
                manager: { select: { id: true, directionId: true } }
            }
        });
        if (!demande) {
            throw new CircuitError('Demande non trouvée', 404);
        }
        if (!demande.manager.directionId) {
            throw new CircuitError('Le manager demandeur doit avoir une direction', 400);
        }
        const circuit = await findCircuitByBudget(Number(demande.budgetEstime));
        const etapes = circuit.etapes || [];
        if (!etapes.length) {
            throw new CircuitError('Le circuit est mal configuré (aucune etape)', 500);
        }
        const firstStep = etapes[0];
        const firstValidator = await findValidatorForRole(firstStep.role, demande.manager.directionId);
        if (!firstValidator) {
            throw new CircuitError(`Aucun validateur actif pour le role ${firstStep.role}`, 400);
        }
        await prisma_1.default.demandeRecrutement.update({
            where: { id: demandeId },
            data: {
                circuitType: circuit.type,
                totalEtapes: circuit.totalEtapes,
                circuitConfigId: circuit.id,
                directionId: demande.manager.directionId,
                etapeActuelle: 1,
                statut: mapStatusByRole(firstStep.role)
            }
        });
        await prisma_1.default.validationEtape.create({
            data: {
                demandeId,
                niveauEtape: 1,
                acteurId: firstValidator.id,
                dateLimite: addHours(48)
            }
        });
        return {
            circuitType: circuit.type,
            totalEtapes: circuit.totalEtapes,
            prochaineEtape: firstStep
        };
    },
    async validateStep(demandeId, userId, decision, commentaire) {
        const demande = await prisma_1.default.demandeRecrutement.findUnique({
            where: { id: demandeId },
            include: {
                validations: {
                    where: { decision: 'EN_ATTENTE' },
                    orderBy: { niveauEtape: 'asc' }
                },
                circuitConfig: true
            }
        });
        if (!demande) {
            throw new CircuitError('Demande non trouvée', 404);
        }
        const currentValidation = demande.validations[0];
        if (!currentValidation) {
            throw new CircuitError('Aucune etape en attente pour cette demande', 400);
        }
        if (currentValidation.acteurId !== userId) {
            throw new CircuitError('Vous n\'etes pas le validateur attendu pour cette etape', 403);
        }
        const prismaDecision = decision === 'VALIDE' ? 'VALIDEE' : decision === 'REFUSE' ? 'REFUSEE' : 'MODIFIEE';
        await prisma_1.default.validationEtape.update({
            where: { id: currentValidation.id },
            data: {
                decision: prismaDecision,
                commentaire,
                dateDecision: new Date()
            }
        });
        if (decision === 'REFUSE') {
            await prisma_1.default.demandeRecrutement.update({
                where: { id: demandeId },
                data: { statut: 'REJETEE' }
            });
            return { status: 'REJETEE' };
        }
        if (decision === 'MODIFIE') {
            await prisma_1.default.demandeRecrutement.update({
                where: { id: demandeId },
                data: { statut: 'BROUILLON', etapeActuelle: 0 }
            });
            return { status: 'BROUILLON' };
        }
        if (demande.etapeActuelle >= (demande.totalEtapes || 1) - 1) {
            const offre = await createOfferFromDemande(demande, userId);
            await prisma_1.default.demandeRecrutement.update({
                where: { id: demandeId },
                data: {
                    statut: 'VALIDEE',
                    valideeAt: new Date(),
                    offre: { connect: { id: offre.id } }
                }
            });
            return { status: 'VALIDEE', offre };
        }
        const etapes = demande.circuitConfig?.etapes || [];
        let nextLevel = demande.etapeActuelle + 1;
        let nextStep = etapes.find((step) => step.niveau === nextLevel);
        let nextValidator = nextStep ? await findValidatorForRole(nextStep.role, demande.directionId) : null;
        while (nextStep && nextStep.role === 'DGA' && !nextValidator) {
            nextLevel += 1;
            nextStep = etapes.find((step) => step.niveau === nextLevel);
            nextValidator = nextStep ? await findValidatorForRole(nextStep.role, demande.directionId) : null;
        }
        if (!nextStep || !nextValidator) {
            throw new CircuitError('Impossible de determiner le prochain validateur', 400);
        }
        await prisma_1.default.validationEtape.create({
            data: {
                demandeId,
                niveauEtape: nextLevel,
                acteurId: nextValidator.id,
                dateLimite: addHours(48)
            }
        });
        await prisma_1.default.demandeRecrutement.update({
            where: { id: demandeId },
            data: {
                etapeActuelle: nextLevel,
                statut: mapStatusByRole(nextStep.role)
            }
        });
        return { status: mapStatusByRole(nextStep.role), nextStep };
    },
    CircuitError
};
