"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitConfigService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const constants_1 = require("../config/constants");
exports.circuitConfigService = {
    /**
     * Initialiser les circuits par défaut
     */
    async initDefaultCircuits() {
        const circuits = Object.values(constants_1.CIRCUITS_PAR_DEFAUT);
        for (const circuit of circuits) {
            await prisma_1.default.circuitConfig.upsert({
                where: { type: circuit.type },
                update: {
                    nom: circuit.nom,
                    description: circuit.description,
                    seuilMin: circuit.seuilMin,
                    seuilMax: circuit.seuilMax,
                    etapes: circuit.etapes,
                    totalEtapes: circuit.totalEtapes,
                    delaiParDefaut: circuit.delaiParDefaut,
                    actif: true
                },
                create: {
                    type: circuit.type,
                    nom: circuit.nom,
                    description: circuit.description,
                    seuilMin: circuit.seuilMin,
                    seuilMax: circuit.seuilMax,
                    etapes: circuit.etapes,
                    totalEtapes: circuit.totalEtapes,
                    delaiParDefaut: circuit.delaiParDefaut,
                    actif: true
                }
            });
        }
        console.log('✅ Circuits de validation initialisés');
    },
    /**
     * Récupérer tous les circuits actifs
     */
    async getAllCircuits() {
        return await prisma_1.default.circuitConfig.findMany({
            where: { actif: true },
            orderBy: { seuilMin: 'asc' }
        });
    },
    /**
     * Déterminer le circuit selon le budget
     */
    async determinerCircuitParBudget(budget) {
        const circuits = await prisma_1.default.circuitConfig.findMany({
            where: { actif: true },
            orderBy: { seuilMin: 'asc' }
        });
        for (const circuit of circuits) {
            const seuilMin = circuit.seuilMin ?? 0;
            const seuilMax = circuit.seuilMax ?? Infinity;
            if (budget >= seuilMin && budget < seuilMax) {
                return circuit;
            }
        }
        return circuits[circuits.length - 1];
    },
    /**
     * Mettre à jour un circuit
     */
    async updateCircuit(id, data, userId) {
        if (data.etapes) {
            const rolesValides = ['DIRECTEUR', 'DRH', 'DAF', 'DGA', 'DG'];
            for (const etape of data.etapes) {
                if (!rolesValides.includes(etape.role)) {
                    throw new Error(`Rôle invalide: ${etape.role}. Rôles supportés: DIRECTEUR, DRH, DAF, DGA, DG`);
                }
                if (!etape.label || !etape.niveau) {
                    throw new Error('Chaque étape doit avoir un niveau et un label');
                }
            }
        }
        return await prisma_1.default.circuitConfig.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    },
    /**
     * Créer un circuit personnalisé
     */
    async createCircuit(data, userId) {
        return await prisma_1.default.circuitConfig.create({
            data: {
                ...data,
                type: 'PERSONNALISE',
                actif: true,
                createdBy: userId
            }
        });
    },
    /**
     * Activer/Désactiver un circuit
     */
    async toggleCircuitActivation(id, actif) {
        return await prisma_1.default.circuitConfig.update({
            where: { id },
            data: { actif }
        });
    },
    /**
     * Récupérer un circuit par ID
     */
    async getCircuitById(id) {
        return await prisma_1.default.circuitConfig.findUnique({
            where: { id }
        });
    }
};
