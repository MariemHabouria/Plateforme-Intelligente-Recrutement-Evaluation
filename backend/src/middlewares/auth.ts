// backend/src/middlewares/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/prisma';

interface JwtPayload {
  id: string;
  role: string;
  directionId?: string;
}

// ✅ CORRECTION : Utiliser la variable d'environnement
const VALIDATION_SECRET = process.env.VALIDATION_SECRET || 'kilani-validation-secret-2026-securise';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        nom: string;
        prenom: string;
        role: string;
        actif: boolean;
        directionId: string | null;
        direction?: {
          id: string;
          code: string;
          nom: string;
        } | null;
      };
      validationToken?: {
        demandeId: string;
        acteurId: string;
        role: string;
        niveauEtape: number;
        isValid: boolean;
      };
    }
  }
}

// ============================================
// SERVICE DE GENERATION DE TOKEN DE VALIDATION
// ============================================
export class ValidationTokenService {
  
  static genererToken(demandeId: string, role: string, etape: number): string {
    const data = `${demandeId}-${role}-${etape}`;
    return crypto
      .createHmac('sha256', VALIDATION_SECRET)
      .update(data)
      .digest('hex')
      .substring(0, 24);
  }

  static verifierToken(demandeId: string, role: string, etape: number, token: string): boolean {
    const tokenAttendu = this.genererToken(demandeId, role, etape);
    return token === tokenAttendu;
  }

  static genererUrlValidation(demandeId: string, role: string, etape: number): string {
    const token = this.genererToken(demandeId, role, etape);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${frontendUrl}/validation/${demandeId}?token=${token}`;
  }

  static genererUrlWorkflow(demandeId: string, role: string, etape: number): string {
    return this.genererUrlValidation(demandeId, role, etape);
  }
}

// ============================================
// MIDDLEWARE D'AUTHENTIFICATION STANDARD
// ============================================
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Non autorise - Token manquant' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        actif: true,
        directionId: true,
        direction: {
          select: { id: true, code: true, nom: true }
        }
      }
    });

    if (!user || !user.actif) {
      return res.status(401).json({ 
        success: false,
        message: 'Non autorise - Utilisateur non trouve ou inactif' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ 
      success: false,
      message: 'Non autorise - Token invalide' 
    });
  }
};

// ============================================
// MIDDLEWARE DE VERIFICATION DE TOKEN DE VALIDATION
// ============================================
export const verifierTokenValidation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de validation manquant' 
      });
    }

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        validations: {
          where: { decision: 'EN_ATTENTE' },
          orderBy: { niveauEtape: 'asc' },
          include: {
            acteur: {
              select: {
                id: true,
                role: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!demande) {
      return res.status(404).json({ 
        success: false, 
        message: 'Demande non trouvee' 
      });
    }

    const validationEnCours = demande.validations[0];
    if (!validationEnCours) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune validation en cours pour cette demande' 
      });
    }

    const isValid = ValidationTokenService.verifierToken(
      demande.id,
      validationEnCours.acteur.role,
      validationEnCours.niveauEtape,
      token as string
    );

    if (!isValid) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token de validation invalide ou expire' 
      });
    }

    (req as any).validationToken = {
      demandeId: demande.id,
      acteurId: validationEnCours.acteurId,
      role: validationEnCours.acteur.role,
      niveauEtape: validationEnCours.niveauEtape,
      isValid: true
    };

    if (req.user) {
      if (req.user.id !== validationEnCours.acteurId) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'etes pas le validateur designe pour cette demande'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Erreur verification token:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la verification du token' 
    });
  }
};

// ============================================
// MIDDLEWARE D'AUTORISATION (RBAC)
// ============================================
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Non autorise - Utilisateur non authentifie' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Acces interdit - Role ${req.user.role} non autorise. Roles requis: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

// ============================================
// MIDDLEWARE D'OPTION (AUTH OU TOKEN)
// ============================================
export const protectOrToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            role: true,
            actif: true,
            directionId: true,
            direction: {
              select: { id: true, code: true, nom: true }
            }
          }
        });
        if (user && user.actif) {
          req.user = user;
          return next();
        }
      } catch (jwtError) {
        console.log('JWT invalide, tentative token de validation...');
      }
    }

    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentification requise' 
      });
    }

    const demande = await prisma.demandeRecrutement.findUnique({
      where: { id },
      include: {
        validations: {
          where: { decision: 'EN_ATTENTE' },
          orderBy: { niveauEtape: 'asc' },
          include: {
            acteur: {
              select: {
                id: true,
                role: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!demande) {
      return res.status(404).json({ 
        success: false, 
        message: 'Demande non trouvee' 
      });
    }

    const validationEnCours = demande.validations[0];
    if (!validationEnCours) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune validation en cours pour cette demande' 
      });
    }

    const isValid = ValidationTokenService.verifierToken(
      demande.id,
      validationEnCours.acteur.role,
      validationEnCours.niveauEtape,
      token as string
    );

    if (!isValid) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token de validation invalide ou expire' 
      });
    }

    (req as any).validationToken = {
      demandeId: demande.id,
      acteurId: validationEnCours.acteurId,
      role: validationEnCours.acteur.role,
      niveauEtape: validationEnCours.niveauEtape,
      isValid: true
    };

    next();
  } catch (error) {
    console.error('Erreur protectOrToken:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'authentification' 
    });
  }
};