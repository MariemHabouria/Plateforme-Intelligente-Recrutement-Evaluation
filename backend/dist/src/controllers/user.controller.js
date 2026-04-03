"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.resendInvite = exports.deleteUser = exports.toggleUserStatus = exports.updateUser = exports.getUserById = exports.getUsers = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const password_util_1 = require("../utils/password.util");
const email_service_1 = require("../services/email.service");
// ===========================================
// GESTION DES UTILISATEURS (SUPER ADMIN)
// ===========================================
/**
 * Récupérer tous les utilisateurs
 */
const getUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                role: true,
                departement: true,
                directionId: true,
                poste: true,
                telephone: true,
                actif: true,
                mustChangePassword: true,
                dernierConnexion: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            count: users.length,
            users
        });
    }
    catch (error) {
        console.error('❌ Erreur getUsers:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.getUsers = getUsers;
/**
 * Récupérer un utilisateur par ID
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                role: true,
                departement: true,
                directionId: true,
                poste: true,
                telephone: true,
                actif: true,
                mustChangePassword: true,
                dernierConnexion: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }
        res.json({ success: true, user });
    }
    catch (error) {
        console.error('❌ Erreur getUserById:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.getUserById = getUserById;
/**
 * Mettre à jour un utilisateur
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, prenom, role, departement, directionId, poste, telephone, actif } = req.body;
        const user = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }
        const normalizedDirectionId = directionId ? Number(directionId) : null;
        const needsDirection = role === 'MANAGER' || role === 'DIRECTEUR';
        if (needsDirection && !normalizedDirectionId) {
            return res.status(400).json({
                success: false,
                message: 'directionId est obligatoire pour MANAGER et DIRECTEUR'
            });
        }
        if (!needsDirection && normalizedDirectionId) {
            return res.status(400).json({
                success: false,
                message: 'directionId doit etre null pour ce role'
            });
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id },
            data: {
                nom,
                prenom,
                role,
                departement,
                directionId: normalizedDirectionId,
                poste,
                telephone,
                actif
            },
            select: {
                id: true,
                email: true,
                nom: true,
                prenom: true,
                role: true,
                departement: true,
                directionId: true,
                poste: true,
                telephone: true,
                actif: true,
                mustChangePassword: true,
                dernierConnexion: true
            }
        });
        res.json({
            success: true,
            message: 'Utilisateur mis à jour',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('❌ Erreur updateUser:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.updateUser = updateUser;
/**
 * Activer/Désactiver un utilisateur
 */
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id },
            data: { actif: !user.actif },
            select: { actif: true }
        });
        res.json({
            success: true,
            message: `Utilisateur ${updatedUser.actif ? 'activé' : 'désactivé'}`,
            actif: updatedUser.actif
        });
    }
    catch (error) {
        console.error('❌ Erreur toggleUserStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.toggleUserStatus = toggleUserStatus;
/**
 * Supprimer un utilisateur
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Empêcher l'auto-suppression
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Vous ne pouvez pas supprimer votre propre compte'
            });
        }
        await prisma_1.default.user.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Utilisateur supprimé'
        });
    }
    catch (error) {
        console.error('❌ Erreur deleteUser:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.deleteUser = deleteUser;
/**
 * Renvoyer l'invitation (nouveau mot de passe temporaire)
 */
const resendInvite = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }
        // Générer nouveau mot de passe temporaire
        const tempPassword = (0, password_util_1.generateTemporaryPassword)();
        const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
        await prisma_1.default.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                mustChangePassword: true
            }
        });
        // Envoyer email d'invitation
        await email_service_1.emailService.sendInvitationEmail({
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            tempPassword,
            role: user.role,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
        });
        res.json({
            success: true,
            message: 'Invitation renvoyée avec succès. Consultez la console.'
        });
    }
    catch (error) {
        console.error('❌ Erreur resendInvite:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du renvoi'
        });
    }
};
exports.resendInvite = resendInvite;
/**
 * Réinitialiser le mot de passe
 */
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.default.user.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }
        const tempPassword = (0, password_util_1.generateTemporaryPassword)();
        const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
        await prisma_1.default.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                mustChangePassword: true
            }
        });
        await email_service_1.emailService.sendResetPasswordEmail({
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            tempPassword,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
        });
        res.json({
            success: true,
            message: 'Mot de passe réinitialisé. Consultez la console.'
        });
    }
    catch (error) {
        console.error('❌ Erreur resetPassword:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la réinitialisation'
        });
    }
};
exports.resetPassword = resetPassword;
