"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.changePassword = exports.login = exports.register = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const password_util_1 = require("../utils/password.util");
const email_service_1 = require("../services/email.service");
// ===========================================
// FONCTIONS UTILITAIRES
// ===========================================
const generateToken = (id, role) => {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRE || '7d';
    return jsonwebtoken_1.default.sign({ id, role }, secret, { expiresIn } // ← Correction avec "as jwt.SignOptions"
    );
};
// ===========================================
// POUR SUPER ADMIN - CRÉATION D'UTILISATEUR
// ===========================================
/**
 * Créer un nouvel utilisateur (Super Admin uniquement)
 * Génère un mot de passe temporaire et envoie un email
 */
const register = async (req, res) => {
    try {
        const { email, nom, prenom, role, departement, poste, telephone, directionId } = req.body;
        // Validation des champs requis
        if (!email || !nom || !prenom || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, nom, prénom et rôle sont requis'
            });
        }
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }
        // Générer un mot de passe temporaire sécurisé
        const tempPassword = (0, password_util_1.generateTemporaryPassword)();
        const hashedPassword = await bcrypt_1.default.hash(tempPassword, 10);
        const normalizedDirectionId = directionId ? Number(directionId) : null;
        const needsDirection = role === 'MANAGER' || role === 'DIRECTEUR';
        if (needsDirection && !normalizedDirectionId) {
            return res.status(400).json({
                success: false,
                message: 'directionId est obligatoire pour les roles MANAGER et DIRECTEUR'
            });
        }
        if (!needsDirection && normalizedDirectionId) {
            return res.status(400).json({
                success: false,
                message: 'directionId doit etre null pour les roles transversaux'
            });
        }
        // Créer l'utilisateur dans la base de données
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                nom,
                prenom,
                role,
                departement,
                directionId: normalizedDirectionId,
                poste,
                telephone,
                mustChangePassword: true,
                actif: true,
                createdById: req.user?.id
            }
        });
        // Envoyer l'email de bienvenue
        await email_service_1.emailService.sendWelcomeEmail({
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            tempPassword,
            role: user.role,
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
        });
        // Retourner l'utilisateur sans le mot de passe
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès. Consultez la console pour les identifiants.',
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error('❌ Erreur register:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création'
        });
    }
};
exports.register = register;
// ===========================================
// POUR TOUS LES UTILISATEURS - CONNEXION
// ===========================================
/**
 * Connexion à l'application
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }
        if (!user.actif) {
            return res.status(401).json({
                success: false,
                message: 'Compte désactivé. Contactez l\'administrateur.'
            });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { dernierConnexion: new Date() }
        });
        const token = generateToken(user.id, user.role);
        const userData = {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            departement: user.departement,
            directionId: user.directionId,
            poste: user.poste,
            mustChangePassword: user.mustChangePassword
        };
        // Si première connexion (mot de passe temporaire)
        if (user.mustChangePassword) {
            return res.json({
                success: true,
                forcePasswordChange: true,
                token,
                user: userData,
                message: 'Veuillez changer votre mot de passe'
            });
        }
        res.json({
            success: true,
            token,
            user: userData
        });
    }
    catch (error) {
        console.error('❌ Erreur login:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.login = login;
// ===========================================
// CHANGEMENT DE MOT DE PASSE
// ===========================================
/**
 * Changer le mot de passe (première connexion ou volontaire)
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mot de passe actuel et nouveau mot de passe requis'
            });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }
        const validation = (0, password_util_1.validatePasswordStrength)(newPassword);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });
        res.json({
            success: true,
            message: 'Mot de passe changé avec succès'
        });
    }
    catch (error) {
        console.error('❌ Erreur changePassword:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.changePassword = changePassword;
// ===========================================
// PROFIL
// ===========================================
/**
 * Récupérer le profil de l'utilisateur connecté
 */
const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
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
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        console.error('❌ Erreur getMe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};
exports.getMe = getMe;
