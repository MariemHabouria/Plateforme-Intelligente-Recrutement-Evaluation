// backend/src/middlewares/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

interface JwtPayload {
  id: string;
  role: string;
  directionId?: string;
}

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
    }
  }
}

// ============================================
// MIDDLEWARE D'AUTHENTIFICATION
// ============================================
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;

    // Récupérer le token du header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Non autorisé - Token manquant' 
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Récupérer l'utilisateur
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
        message: 'Non autorisé - Utilisateur non trouvé ou inactif' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ 
      success: false,
      message: 'Non autorisé - Token invalide' 
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
        message: 'Non autorisé - Utilisateur non authentifié' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Accès interdit - Rôle ${req.user.role} non autorisé. Rôles requis: ${roles.join(', ')}` 
      });
    }

    next();
  };
};