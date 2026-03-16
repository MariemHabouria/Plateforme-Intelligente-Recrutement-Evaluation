// backend/src/services/email.service.ts
// SIMULATION - Pas besoin d'API email, juste des console.log

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

interface NotificationData {
  nom: string;
  prenom: string;
  email: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

// Couleurs pour la console
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
   * Email de bienvenue - Simulation console
   */
  async sendWelcomeEmail(data: WelcomeEmailData) {
    console.log('\n' + colors.yellow + '╔' + '═'.repeat(58) + '╗' + colors.reset);
    console.log(colors.yellow + '║' + colors.bright + ' 📧 SIMULATION EMAIL DE BIENVENUE ' + ' '.repeat(30) + colors.yellow + '║' + colors.reset);
    console.log(colors.yellow + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.yellow + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + ` Rôle: ${data.role}` + ' '.repeat(50 - data.role.length) + colors.yellow + '║');
    console.log(colors.yellow + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.yellow + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(40) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + ` Votre compte a été créé sur Kilani RH.` + ' '.repeat(30) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + `` + ' '.repeat(58) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.bright + colors.green + ` 🔐 IDENTIFIANTS TEMPORAIRES` + ' '.repeat(32) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + ` Email: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + ` Mot de passe: ${colors.bright}${data.tempPassword}${colors.reset}` + ' '.repeat(42 - data.tempPassword.length) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + `` + ' '.repeat(58) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.bright + colors.cyan + ` 🌐 LIEN DE CONNEXION` + ' '.repeat(37) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + ` ${data.loginUrl}` + ' '.repeat(54 - data.loginUrl.length) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.reset + `` + ' '.repeat(58) + colors.yellow + '║');
    console.log(colors.yellow + '║' + colors.dim + ` ⚠️ Vous devrez changer ce mot de passe à la première connexion.` + ' '.repeat(8) + colors.yellow + '║');
    console.log(colors.yellow + '╚' + '═'.repeat(58) + '╝' + colors.reset + '\n');
    
    // Simuler un délai
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return { 
      success: true, 
      simulated: true,
      to: data.email,
      type: 'welcome'
    };
  },

  /**
   * Email de réinitialisation - Simulation console
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
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, simulated: true, to: data.email, type: 'reset' };
  },

  /**
   * Email d'invitation (renvoi) - Simulation console
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
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, simulated: true, to: data.email, type: 'invitation' };
  },

  /**
   * Email de notification - Simulation console
   */
  async sendNotificationEmail(data: NotificationData) {
    console.log('\n' + colors.green + '╔' + '═'.repeat(58) + '╗' + colors.reset);
    console.log(colors.green + '║' + colors.bright + ' 🔔 SIMULATION NOTIFICATION ' + ' '.repeat(35) + colors.green + '║' + colors.reset);
    console.log(colors.green + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.green + '║' + colors.reset + ` À: ${data.email}` + ' '.repeat(48 - data.email.length) + colors.green + '║');
    console.log(colors.green + '╠' + '═'.repeat(58) + '╣' + colors.reset);
    console.log(colors.green + '║' + colors.reset + ` Bonjour ${data.prenom} ${data.nom},` + ' '.repeat(40) + colors.green + '║');
    console.log(colors.green + '║' + colors.reset + ` ${data.message}` + ' '.repeat(58 - data.message.length) + colors.green + '║');
    if (data.actionUrl) {
      console.log(colors.green + '║' + colors.reset + ` Lien: ${data.actionUrl}` + ' '.repeat(50 - data.actionUrl.length) + colors.green + '║');
    }
    console.log(colors.green + '╚' + '═'.repeat(58) + '╝' + colors.reset + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true, simulated: true, to: data.email, type: 'notification' };
  },

  /**
   * Version simplifiée pour les logs
   */
  logEmail(type: string, to: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📧 EMAIL [${type}] → ${to}`);
  }
};