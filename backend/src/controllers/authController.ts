import { Request, Response } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateTemporaryPassword, validatePasswordStrength } from '../utils/password.util';
import { emailService } from '../services/email.service';

// ===========================================
// FONCTIONS UTILITAIRES
// ===========================================

const generateToken = (id: string, role: string): string => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  
  return jwt.sign(
    { id, role },
    secret,
    { expiresIn } as jwt.SignOptions
  );
};

// ===========================================
// POUR SUPER ADMIN - CRÉATION D'UTILISATEUR
// ===========================================

/**
 * Créer un nouvel utilisateur (Super Admin uniquement)
 * Génère un mot de passe temporaire et envoie un email
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, nom, prenom, role, poste, telephone, directionId } = req.body;

    // Validation des champs requis
    if (!email || !nom || !prenom || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, nom, prénom et rôle sont requis'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Générer un mot de passe temporaire sécurisé
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Créer l'utilisateur dans la base de données
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nom,
        prenom,
        role,
        poste: poste || null,
        telephone: telephone || null,
        directionId: directionId || null,
        mustChangePassword: true,
        actif: true,
        
      }
    });

    // Envoyer l'email de bienvenue
    await emailService.sendWelcomeEmail({
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
      message: 'Utilisateur créé avec succès. Un email a été envoyé avec ses identifiants.',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('❌ Erreur register:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création'
    });
  }
};

// ===========================================
// POUR TOUS LES UTILISATEURS - CONNEXION
// ===========================================

/**
 * Connexion à l'application
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        direction: {
          select: { id: true, code: true, nom: true }
        }
      }
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    await prisma.user.update({
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
      poste: user.poste,
      directionId: user.directionId,
      direction: user.direction,
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

  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ===========================================
// CHANGEMENT DE MOT DE PASSE
// ===========================================

/**
 * Changer le mot de passe (première connexion ou volontaire)
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
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

  } catch (error) {
    console.error('❌ Erreur changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// ===========================================
// PROFIL
// ===========================================

/**
 * Récupérer le profil de l'utilisateur connecté
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        poste: true,
        telephone: true,
        directionId: true,
        direction: {
          select: { id: true, code: true, nom: true }
        },
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

  } catch (error) {
    console.error('❌ Erreur getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};