// backend/src/services/email.service.ts

interface ValidationNotificationData {
  nom: string;
  prenom: string;
  email: string;
  demandeRef: string;
  demandePoste: string;
  etape: number;
  totalEtapes: number;
  role: string;
  dateLimite: Date;
  actionUrl: string;
}

interface WelcomeEmailData {
  nom: string;
  prenom: string;
  email: string;
  tempPassword: string;
  role: string;
  loginUrl: string;
}

interface ResetPasswordData {
  nom: string;
  prenom: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

interface InvitationData {
  nom: string;
  prenom: string;
  email: string;
  tempPassword: string;
  role: string;
  loginUrl: string;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

export const emailService = {
  /**
   * Email de bienvenue pour les nouveaux utilisateurs
   */
  async sendWelcomeEmail(data: WelcomeEmailData) {
    console.log('\n' + colors.green + '╔' + '═'.repeat(58) + '╗' + colors.reset);
    console.log(colors.green + '║' + colors.bright + ' 📧 SIMULATION EMAIL DE BIENVENUE ' + ' '.repeat(30) + colors.green + '║' + colors.reset);
    console.log(colors.green + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.green + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` Rôle: ${data.role}` + ' '.repeat(50 - data.role.length) + colors.green + '║');
    console.log(colors.green + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.green + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(40) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` Votre compte a été créé sur Kilani RH.` + ' '.repeat(30) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + `` + ' '.repeat(58) + colors.green + '║');
    console.log(colors.green + '║' + colors.bright + colors.green + ` 🔐 IDENTIFIANTS TEMPORAIRES` + ' '.repeat(32) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` Email: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` Mot de passe: ${colors.bright}${data.tempPassword}${colors.reset}` + ' '.repeat(42 - data.tempPassword.length) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + `` + ' '.repeat(58) + colors.green + '║');
    console.log(colors.green + '║' + colors.bright + colors.cyan + ` 🌐 LIEN DE CONNEXION` + ' '.repeat(37) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` ${data.loginUrl}` + ' '.repeat(54 - data.loginUrl.length) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + `` + ' '.repeat(58) + colors.green + '║');
    console.log(colors.green + '║' + colors.dim + ` ⚠️ Vous devrez changer ce mot de passe à la première connexion.` + ' '.repeat(8) + colors.green + '║');
    console.log(colors.green + '╚' + '═'.repeat(58) + '╝' + colors.reset + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'welcome' };
  },

  /**
   * Email de réinitialisation de mot de passe
   */
  async sendResetPasswordEmail(data: ResetPasswordData) {
    console.log('\n' + colors.magenta + '╔' + '═'.repeat(58) + '╗' + colors.reset);
    console.log(colors.magenta + '║' + colors.bright + ' 🔑 SIMULATION RÉINITIALISATION MOT DE PASSE ' + ' '.repeat(15) + colors.magenta + '║' + colors.reset);
    console.log(colors.magenta + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.magenta + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.magenta + '║');
    console.log(colors.magenta + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.magenta + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(40) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + ` Votre mot de passe a été réinitialisé.` + ' '.repeat(32) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + `` + ' '.repeat(58) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.bright + colors.green + ` 🔐 NOUVEAU MOT DE PASSE TEMPORAIRE` + ' '.repeat(22) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + ` ${data.tempPassword}` + ' '.repeat(54 - data.tempPassword.length) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + `` + ' '.repeat(58) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.bright + colors.cyan + ` 🌐 LIEN DE CONNEXION` + ' '.repeat(37) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + ` ${data.loginUrl}` + ' '.repeat(54 - data.loginUrl.length) + colors.magenta + '║');
    console.log(colors.magenta + '╚' + '═'.repeat(58) + '╝' + colors.reset + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'reset' };
  },

  /**
   * Email d'invitation
   */
  async sendInvitationEmail(data: InvitationData) {
    console.log('\n' + colors.blue + '╔' + '═'.repeat(58) + '╗' + colors.reset);
    console.log(colors.blue + '║' + colors.bright + ' 📨 SIMULATION RENVOI D\'INVITATION ' + ' '.repeat(26) + colors.blue + '║' + colors.reset);
    console.log(colors.blue + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.blue + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + ` Rôle: ${data.role}` + ' '.repeat(50 - data.role.length) + colors.blue + '║');
    console.log(colors.blue + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.blue + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(40) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + ` Vous avez été invité à rejoindre Kilani RH.` + ' '.repeat(25) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.bright + colors.green + ` 🔐 IDENTIFIANTS DE CONNEXION` + ' '.repeat(30) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + ` Email: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + ` Mot de passe temporaire: ${data.tempPassword}` + ' '.repeat(32 - data.tempPassword.length) + colors.blue + '║');
    console.log(colors.blue + '╚' + '═'.repeat(58) + '╝' + colors.reset + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'invitation' };
  },

  /**
   * Notification de validation à envoyer au prochain validateur
   */
  async sendValidationNotification(data: ValidationNotificationData) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log('\n' + colors.blue + '╔' + '═'.repeat(68) + '╗' + colors.reset);
    console.log(colors.blue + '║' + colors.bright + ' 📢 SIMULATION - NOUVELLE VALIDATION ATTENDUE ' + ' '.repeat(28) + colors.blue + '║' + colors.reset);
    console.log(colors.blue + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.blue + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(58 - data.email.length) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + ` Rôle: ${data.role}` + ' '.repeat(60 - data.role.length) + colors.blue + '║');
    console.log(colors.blue + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.blue + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(48) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + `` + ' '.repeat(68) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + ` 📄 Une demande de recrutement est en attente de votre validation :` + ' '.repeat(6) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + `` + ' '.repeat(68) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.bright + `    Référence: ${data.demandeRef}` + ' '.repeat(48 - data.demandeRef.length) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + `    Poste: ${data.demandePoste}` + ' '.repeat(52 - data.demandePoste.length) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + `    Étape: ${data.etape}/${data.totalEtapes}` + ' '.repeat(56 - String(data.etape).length - String(data.totalEtapes).length) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.yellow + `    Délai: ${dateFormatee} (48h max)` + ' '.repeat(38) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + `` + ' '.repeat(68) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.bright + colors.cyan + ` 🌐 LIEN D'ACTION:` + ' '.repeat(52) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + `    ${data.actionUrl}` + ' '.repeat(58 - data.actionUrl.length) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.reset + `` + ' '.repeat(68) + colors.blue + '║');
    console.log(colors.blue + '║' + colors.dim + ` ⚠️ Merci de traiter cette demande dans les meilleurs délais.` + ' '.repeat(15) + colors.blue + '║');
    console.log(colors.blue + '╚' + '═'.repeat(68) + '╝' + colors.reset + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'validation' };
  },

  /**
   * Notification de validation finale (offre générée)
   */
  async sendOffreGenereeNotification(data: {
    nom: string;
    prenom: string;
    email: string;
    demandeRef: string;
    offreRef: string;
    poste: string;
    actionUrl: string;
  }) {
    console.log('\n' + colors.green + '╔' + '═'.repeat(68) + '╗' + colors.reset);
    console.log(colors.green + '║' + colors.bright + ' 🎉 SIMULATION - OFFRE GÉNÉRÉE ' + ' '.repeat(44) + colors.green + '║' + colors.reset);
    console.log(colors.green + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.green + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(58 - data.email.length) + colors.green + '║');
    console.log(colors.green + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.green + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(48) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + `` + ' '.repeat(68) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` ✅ La demande ${data.demandeRef} a été validée !` + ' '.repeat(35) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` 📝 Une offre d'emploi a été générée automatiquement :` + ' '.repeat(11) + colors.green + '║');
    console.log(colors.green + '║' + colors.bright + `    Référence offre: ${data.offreRef}` + ' '.repeat(45 - data.offreRef.length) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + `    Poste: ${data.poste}` + ' '.repeat(58 - data.poste.length) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + `` + ' '.repeat(68) + colors.green + '║');
    console.log(colors.green + '║' + colors.bright + colors.cyan + ` 🌐 LIEN VERS L'OFFRE:` + ' '.repeat(50) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + `    ${data.actionUrl}` + ' '.repeat(58 - data.actionUrl.length) + colors.green + '║');
    console.log(colors.green + '╚' + '═'.repeat(68) + '╝' + colors.reset + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'offre_generee' };
  },

  /**
   * Notification de rejet
   */
  async sendRejetNotification(data: {
    nom: string;
    prenom: string;
    email: string;
    demandeRef: string;
    poste: string;
    commentaire?: string;
    role: string;
  }) {
    console.log('\n' + colors.yellow + '╔' + '═'.repeat(68) + '╗' + colors.reset);
    console.log(colors.yellow + '║' + colors.bright + ' ⚠️ SIMULATION - DEMANDE REJETÉE ' + ' '.repeat(45) + colors.yellow + '║' + colors.reset);
    console.log(colors.yellow + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.yellow + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(58 - data.email.length) + colors.yellow + '║');
    console.log(colors.yellow + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.yellow + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(48) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + `` + ' '.repeat(68) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + ` ❌ La demande ${data.demandeRef} a été rejetée par ${data.role}.` + ' '.repeat(16) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + `    Poste: ${data.poste}` + ' '.repeat(58 - data.poste.length) + colors.yellow + '║');
    if (data.commentaire) {
      console.log(colors.yellow + '║' + colors.reset + `    Commentaire: ${data.commentaire}` + ' '.repeat(52 - data.commentaire.length) + colors.yellow + '║');
    }
    console.log(colors.yellow + '╚' + '═'.repeat(68) + '╝' + colors.reset + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'rejet' };
  },

  /**
   * Notification de rappel (48h avant deadline)
   */
  async sendRappelNotification(data: {
    nom: string;
    prenom: string;
    email: string;
    demandeRef: string;
    demandePoste: string;
    dateLimite: Date;
    actionUrl: string;
  }) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN');
    
    console.log('\n' + colors.magenta + '╔' + '═'.repeat(68) + '╗' + colors.reset);
    console.log(colors.magenta + '║' + colors.bright + ' ⏰ SIMULATION - RAPPEL DE VALIDATION ' + ' '.repeat(40) + colors.magenta + '║' + colors.reset);
    console.log(colors.magenta + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.magenta + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(58 - data.email.length) + colors.magenta + '║');
    console.log(colors.magenta + '╠' + '═'.repeat(68) + '╣' + colors.reset);
    console.log(colors.magenta + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(48) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.yellow + ` ⚠️ RAPPEL : Une demande est en attente de votre validation !` + ' '.repeat(10) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + `    Référence: ${data.demandeRef}` + ' '.repeat(58 - data.demandeRef.length) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + `    Poste: ${data.demandePoste}` + ' '.repeat(58 - data.demandePoste.length) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.red + `    Délai: ${dateFormatee}` + ' '.repeat(52) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + `` + ' '.repeat(68) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.bright + colors.cyan + ` 🌐 VALIDER MAINTENANT:` + ' '.repeat(48) + colors.magenta + '║');
    console.log(colors.magenta + '║' + colors.reset + `    ${data.actionUrl}` + ' '.repeat(58 - data.actionUrl.length) + colors.magenta + '║');
    console.log(colors.magenta + '╚' + '═'.repeat(68) + '╝' + colors.reset + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'rappel' };
  },

  /**
   * Version simplifiée pour les logs
   */
  logEmail(type: string, to: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📧 EMAIL [${type}] → ${to}`);
  }
};