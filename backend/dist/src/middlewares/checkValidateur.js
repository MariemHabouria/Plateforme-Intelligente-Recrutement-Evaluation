"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkValidateur = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const checkValidateur = async (req, res, next) => {
    try {
        const demandeId = req.params.id;
        const user = req.user;
        const demande = await prisma_1.default.demandeRecrutement.findUnique({
            where: { id: demandeId },
            include: {
                validations: {
                    where: { decision: 'EN_ATTENTE' },
                    orderBy: { niveauEtape: 'asc' }
                }
            }
        });
        if (!demande) {
            return res.status(404).json({ success: false, message: 'Demande non trouvee' });
        }
        const currentValidation = demande.validations[0];
        if (!currentValidation) {
            return res.status(400).json({ success: false, message: 'Aucune etape en attente' });
        }
        if (currentValidation.acteurId !== user.id) {
            return res.status(403).json({ success: false, message: 'Ce n\'est pas votre tour de validation' });
        }
        if (user.role === 'DIRECTEUR' && user.directionId !== demande.directionId) {
            return res.status(403).json({ success: false, message: 'Direction non autorisee pour cette demande' });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur lors du controle du validateur' });
    }
};
exports.checkValidateur = checkValidateur;
