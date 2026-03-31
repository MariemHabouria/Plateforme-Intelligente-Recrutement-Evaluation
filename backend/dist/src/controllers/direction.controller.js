"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirectionById = exports.getDirections = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const helpers_1 = require("../utils/helpers");
const getDirections = async (req, res) => {
    try {
        const directions = await prisma_1.default.direction.findMany({
            orderBy: { code: 'asc' }
        });
        return (0, helpers_1.sendSuccess)(res, { directions }, 'Directions recuperees');
    }
    catch (error) {
        return (0, helpers_1.sendError)(res, 'Erreur lors de la recuperation des directions', 500);
    }
};
exports.getDirections = getDirections;
const getDirectionById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const direction = await prisma_1.default.direction.findUnique({
            where: { id }
        });
        if (!direction) {
            return (0, helpers_1.sendNotFound)(res, 'Direction non trouvee');
        }
        return (0, helpers_1.sendSuccess)(res, { direction }, 'Direction recuperee');
    }
    catch (error) {
        return (0, helpers_1.sendError)(res, 'Erreur lors de la recuperation de la direction', 500);
    }
};
exports.getDirectionById = getDirectionById;
