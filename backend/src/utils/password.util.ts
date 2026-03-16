// backend/src/utils/password.util.ts

/**
 * Génère un mot de passe temporaire sécurisé
 * - 12 caractères
 * - Au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 symbole
 */
export const generateTemporaryPassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  // Garantir au moins un caractère de chaque type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Compléter jusqu'à 12 caractères
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mélanger le mot de passe
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Vérifie la force d'un mot de passe
 */
export const validatePasswordStrength = (password: string): { 
  isValid: boolean; 
  message?: string;
  score: number; // 0-4
} => {
  let score = 0;
  const messages = [];

  // Longueur
  if (password.length >= 8) {
    score++;
  } else {
    messages.push('Au moins 8 caractères');
  }

  // Majuscule
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    messages.push('Au moins une majuscule');
  }

  // Minuscule
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    messages.push('Au moins une minuscule');
  }

  // Chiffre
  if (/\d/.test(password)) {
    score++;
  } else {
    messages.push('Au moins un chiffre');
  }

  // Symbole (optionnel mais recommandé)
  if (/[!@#$%^&*]/.test(password)) {
    score++;
  }

  return {
    isValid: score >= 4,
    message: messages.length > 0 ? messages.join(', ') : undefined,
    score
  };
};