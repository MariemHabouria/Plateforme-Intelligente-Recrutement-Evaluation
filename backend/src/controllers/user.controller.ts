import { Request, Response } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import { generateTemporaryPassword } from '../utils/password.util';
import { emailService } from '../services/email.service';

// ===========================================
// GESTION DES UTILISATEURS (SUPER ADMIN)
// ===========================================

/**
 * Récupérer tous les utilisateurs
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        departement: true,
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

  } catch (error) {
    console.error('❌ Erreur getUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Récupérer un utilisateur par ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        departement: true,
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

  } catch (error) {
    console.error('❌ Erreur getUserById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Mettre à jour un utilisateur
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nom, prenom, role, departement, poste, telephone, actif } = req.body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        nom,
        prenom,
        role,
        departement,
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

  } catch (error) {
    console.error('❌ Erreur updateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Activer/Désactiver un utilisateur
 */
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { actif: !user.actif },
      select: { actif: true }
    });

    res.json({
      success: true,
      message: `Utilisateur ${updatedUser.actif ? 'activé' : 'désactivé'}`,
      actif: updatedUser.actif
    });

  } catch (error) {
    console.error('❌ Erreur toggleUserStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Supprimer un utilisateur
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Empêcher l'auto-suppression
    if (id === (req as any).user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Utilisateur supprimé'
    });

  } catch (error) {
    console.error('❌ Erreur deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

/**
 * Renvoyer l'invitation (nouveau mot de passe temporaire)
 */
export const resendInvite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Générer nouveau mot de passe temporaire
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true
      }
    });

    // Envoyer email d'invitation
    await emailService.sendInvitationEmail({
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

  } catch (error) {
    console.error('❌ Erreur resendInvite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du renvoi'
    });
  }
};

/**
 * Réinitialiser le mot de passe
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true
      }
    });

    await emailService.sendResetPasswordEmail({
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

  } catch (error) {
    console.error('❌ Erreur resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation'
    });
  }
};