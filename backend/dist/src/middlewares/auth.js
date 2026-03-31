"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
// Vérifie que l'utilisateur est authentifié
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Non autorisé - Token manquant'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                role: true,
                directionId: true,
                actif: true
            }
        });
        if (!user || !user.actif) {
            return res.status(401).json({
                success: false,
                message: 'Non autorisé - Utilisateur non trouvé ou inactif'
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Non autorisé - Token invalide'
        });
    }
};
exports.protect = protect;
// Vérifie que l'utilisateur a le bon rôle
const authorize = (...roles) => {
    return (req, res, next) => {
        console.log('🔐 [authorize] ===== DEBUG =====');
        console.log('🔐 [authorize] req.user existe?', !!req.user);
        if (!req.user) {
            console.log('❌ req.user n\'existe pas');
            return res.status(401).json({
                success: false,
                message: 'Non autorisé'
            });
        }
        console.log('🔐 [authorize] Rôle utilisateur (brut):', req.user.role);
        console.log('🔐 [authorize] Type du rôle:', typeof req.user.role);
        console.log('🔐 [authorize] Rôles autorisés:', roles);
        console.log('================================');
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Accès interdit - Rôle ${req.user.role} non autorisé. Rôles requis: ${roles.join(', ')}`
            });
        }
        next();
    };
};
exports.authorize = authorize;
