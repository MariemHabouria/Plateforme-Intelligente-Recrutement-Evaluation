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
        createdAt: true,
        directionId: true,       // ✅ ajouté
        direction: {             // ✅ ajouté
          select: {
            id: true,
            code: true,
            nom: true
          }
        }
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
        createdAt: true,
        directionId: true,       // ✅ ajouté
        direction: {             // ✅ ajouté
          select: {
            id: true,
            code: true,
            nom: true
          }
        }
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
 * Mettre à jour un utilisateur (Super Admin uniquement)
 * ✅ AJOUT: Email de notification si le rôle change
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // ✅ directionId ajouté dans la déstructuration
    const { nom, prenom, role, departement, poste, telephone, actif, directionId } = req.body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Récupérer l'ancien rôle avant mise à jour
    const oldRole = user.role;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        nom,
        prenom,
        role,
        departement,
        poste,
        telephone,
        actif,
        directionId: directionId || null,  // ✅ ajouté, null si vide
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
        dernierConnexion: true,
        directionId: true,       // ✅ ajouté
        direction: {             // ✅ ajouté
          select: {
            id: true,
            code: true,
            nom: true
          }
        }
      }
    });

    // ✅ ENVOYER EMAIL SI LE RÔLE A CHANGÉ
    if (oldRole !== role) {
      await emailService.sendRoleChangeNotification({
        nom: updatedUser.nom,
        prenom: updatedUser.prenom,
        email: updatedUser.email,
        oldRole: oldRole,
        newRole: role,
        changedBy: (req as any).user.nom + ' ' + (req as any).user.prenom
      });
      console.log(`📧 Email de changement de rôle envoyé à ${updatedUser.email}`);
    }

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
 * ✅ AJOUT: Email de notification lors de la désactivation
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

    const newStatus = !user.actif;
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { actif: newStatus },
      select: { actif: true }
    });

    // ✅ ENVOYER EMAIL SI LE COMPTE EST DÉSACTIVÉ
    if (!newStatus) {
      await emailService.sendAccountDeactivationEmail({
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        reason: 'Désactivé par l\'administrateur',
        reactivationDate: undefined
      });
      console.log(`📧 Email de désactivation envoyé à ${user.email}`);
    }

    res.json({
      success: true,
      message: `Utilisateur ${updatedUser.actif ? 'activé' : 'désactivé'}`,
      actif: updatedUser.actif   // ✅ directement à la racine (pas dans data)
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

    // ✅ Vérifier que l'utilisateur existe avant suppression
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
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
 * ✅ AJOUT: Email d'invitation avec nouveau mot de passe
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

    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true
      }
    });

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
      message: 'Invitation renvoyée avec succès.'
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
 * Réinitialiser le mot de passe (par Super Admin)
 * ✅ AJOUT: Email avec nouveau mot de passe temporaire
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

    // ✅ ENVOYER EMAIL DE RÉINITIALISATION
    await emailService.sendResetPasswordEmail({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      tempPassword,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
    });

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé.'
    });

  } catch (error) {
    console.error('❌ Erreur resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation'
    });
  }
};

// ===========================================
// GESTION DU PROFIL PERSONNEL (UTILISATEUR CONNECTÉ)
// ===========================================

/**
 * Mettre à jour son propre profil (utilisateur connecté)
 * ✅ AJOUT: Email de confirmation des modifications
 */
export const updateOwnProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { nom, prenom, telephone, departement, poste } = req.body;

    // Validation basique
    if (nom === '' || prenom === '') {
      return res.status(400).json({
        success: false,
        message: 'Le nom et le prénom ne peuvent pas être vides'
      });
    }

    // Récupérer l'ancien profil pour comparer les changements
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { nom: true, prenom: true, telephone: true, departement: true, poste: true, email: true }
    });

    // Seuls ces champs peuvent être modifiés par l'utilisateur
    const updateData: any = {};
    const changes: string[] = [];

    if (nom !== undefined && nom !== oldUser?.nom) {
      updateData.nom = nom;
      changes.push(`Nom : "${oldUser?.nom}" → "${nom}"`);
    }
    if (prenom !== undefined && prenom !== oldUser?.prenom) {
      updateData.prenom = prenom;
      changes.push(`Prénom : "${oldUser?.prenom}" → "${prenom}"`);
    }
    if (telephone !== undefined && telephone !== oldUser?.telephone) {
      updateData.telephone = telephone;
      changes.push(`Téléphone : "${oldUser?.telephone || 'Non renseigné'}" → "${telephone}"`);
    }
    if (departement !== undefined && departement !== oldUser?.departement) {
      updateData.departement = departement;
      changes.push(`Département : "${oldUser?.departement || 'Non renseigné'}" → "${departement}"`);
    }
    if (poste !== undefined && poste !== oldUser?.poste) {
      updateData.poste = poste;
      changes.push(`Poste : "${oldUser?.poste || 'Non renseigné'}" → "${poste}"`);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification détectée'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    // ✅ ENVOYER EMAIL DE CONFIRMATION SI DES CHANGEMENTS ONT ÉTÉ FAITS
    if (changes.length > 0) {
      await emailService.sendProfileUpdateConfirmation({
        nom: updatedUser.nom,
        prenom: updatedUser.prenom,
        email: updatedUser.email,
        changes,
        profileUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile`
      });
      console.log(`📧 Email de confirmation envoyé à ${updatedUser.email}`);
    }

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Erreur updateOwnProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du profil'
    });
  }
};