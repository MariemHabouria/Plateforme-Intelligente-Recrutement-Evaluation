// backend/src/middlewares/rateLimiter.ts
//
//
// A brancher dans tes routes :
//
//   import { loginRateLimit, registerRateLimit } from '../middlewares/rateLimiter';
//
//   router.post('/login', loginRateLimit, login);
//   router.post('/register', protect, authorize('SUPER_ADMIN'), registerRateLimit, register);

import rateLimit from 'express-rate-limit';

/**
 * Limite les tentatives de connexion : protège contre le brute force
 * sur les mots de passe, en particulier pour les comptes a privileges
 * (SUPER_ADMIN, DRH).
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 tentatives / IP / fenetre
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Reessayez dans 15 minutes.'
  }
});

/**
 * Limite la creation de comptes : moins critique que login (route deja
 * protegee par authorize('SUPER_ADMIN')), mais evite un abus si un token
 * admin venait a fuiter.
 */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20,                   // 20 creations / IP / heure
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de creations de compte recentes. Reessayez plus tard.'
  }
});

/**
 * Limite generique pour les routes publiques accessibles par token
 * (validation de demande, planification d'entretien candidat, etc.)
 */
export const validationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de tentatives. Reessayez plus tard.'
  }
});