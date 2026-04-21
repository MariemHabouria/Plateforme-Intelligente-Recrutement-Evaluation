// backend/src/services/email.service.ts

// ============================================
// INTERFACES
// ============================================

interface NotificationEmailData {
  nom: string;
  prenom: string;
  email: string;
  message: string;
  actionUrl?: string;
}

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

interface ResetPasswordEmailData {
  nom: string;
  prenom: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

interface InvitationEmailData {
  nom: string;
  prenom: string;
  email: string;
  tempPassword: string;
  role: string;
  loginUrl: string;
}

interface ProfileUpdateEmailData {
  nom: string;
  prenom: string;
  email: string;
  changes: string[];
  profileUrl: string;
}

interface RoleChangeEmailData {
  nom: string;
  prenom: string;
  email: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
}

interface AccountDeactivationEmailData {
  nom: string;
  prenom: string;
  email: string;
  reason: string;
  reactivationDate?: string;
}

interface AccountActivationEmailData {
  nom: string;
  prenom: string;
  email: string;
  tempPassword: string;
  activationToken: string;
  activationUrl: string;
}
interface DisponibiliteRequestData {
  nom: string;
  prenom: string;
  email: string;
  demandeRef: string;
  poste: string;
  role: string;        // 'MANAGER' | 'DIRECTEUR'
  actionUrl: string;
}
 
interface EntretienNotificationData {
  nom: string;
  prenom: string;
  email: string;
  candidatNom: string;
  poste: string;
  type: string;        // 'RH' | 'TECHNIQUE' | 'DIRECTION'
  date: Date;
  heure: string;
  lieu: string;
  actionUrl: string;
}
 
// ============================================
// EMAIL SERVICE - VERSION SIMULATION
// ============================================

export const emailService = {
  /**
   * Email de bienvenue pour les nouveaux utilisateurs
   */
  async sendWelcomeEmail(data: WelcomeEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('📧 EMAIL DE BIENVENUE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log(`Rôle: ${data.role}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre compte a été créé sur Kilani RH.`);
    console.log('');
    console.log('🔐 IDENTIFIANTS TEMPORAIRES');
    console.log(`Email: ${data.email}`);
    console.log(`Mot de passe: ${data.tempPassword}`);
    console.log('');
    console.log(`🌐 LIEN DE CONNEXION: ${data.loginUrl}`);
    console.log('');
    console.log(`⚠️ Vous devrez changer ce mot de passe à la première connexion.`);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'welcome' };
  },

  /**
   * Email de réinitialisation de mot de passe
   */
  async sendResetPasswordEmail(data: ResetPasswordEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('🔑 RÉINITIALISATION MOT DE PASSE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre mot de passe a été réinitialisé.`);
    console.log('');
    console.log('🔐 NOUVEAU MOT DE PASSE TEMPORAIRE');
    console.log(`${data.tempPassword}`);
    console.log('');
    console.log(`🌐 LIEN DE CONNEXION: ${data.loginUrl}`);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'reset' };
  },

  /**
   * Email d'invitation
   */
  async sendInvitationEmail(data: InvitationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('📨 RENVOI D\'INVITATION');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log(`Rôle: ${data.role}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Vous avez été invité à rejoindre Kilani RH.`);
    console.log('');
    console.log('🔐 IDENTIFIANTS DE CONNEXION');
    console.log(`Email: ${data.email}`);
    console.log(`Mot de passe temporaire: ${data.tempPassword}`);
    console.log('='.repeat(70) + '\n');
    
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
    
    // ✅ Correction pour éviter l'erreur de repeat
    const totalEtapesSafe = data.totalEtapes || 0;
    const etapeText = totalEtapesSafe > 0 ? `${data.etape}/${totalEtapesSafe}` : `Étape ${data.etape}`;
    
    console.log('\n' + '='.repeat(70));
    console.log('📢 NOUVELLE VALIDATION ATTENDUE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log(`Rôle: ${data.role}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`📄 Une demande de recrutement est en attente de votre validation :`);
    console.log('');
    console.log(`   Référence: ${data.demandeRef}`);
    console.log(`   Poste: ${data.demandePoste}`);
    console.log(`   Étape: ${etapeText}`);
    console.log(`   Délai: ${dateFormatee} (48h max)`);
    console.log('');
    console.log(`🌐 LIEN D'ACTION: ${data.actionUrl}`);
    console.log('');
    console.log(`⚠️ Merci de traiter cette demande dans les meilleurs délais.`);
    console.log('='.repeat(70) + '\n');
    
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
    console.log('\n' + '='.repeat(70));
    console.log('🎉 OFFRE GÉNÉRÉE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`✅ La demande ${data.demandeRef} a été validée !`);
    console.log(`📝 Une offre d'emploi a été générée automatiquement :`);
    console.log(`   Référence offre: ${data.offreRef}`);
    console.log(`   Poste: ${data.poste}`);
    console.log('');
    console.log(`🌐 LIEN VERS L'OFFRE: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    
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
    console.log('\n' + '='.repeat(70));
    console.log('⚠️ DEMANDE REJETÉE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`❌ La demande ${data.demandeRef} a été rejetée par ${data.role}.`);
    console.log(`   Poste: ${data.poste}`);
    if (data.commentaire) {
      console.log(`   Commentaire: ${data.commentaire}`);
    }
    console.log('='.repeat(70) + '\n');
    
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
    
    console.log('\n' + '='.repeat(70));
    console.log('⏰ RAPPEL DE VALIDATION');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`⚠️ RAPPEL : Une demande est en attente de votre validation !`);
    console.log(`   Référence: ${data.demandeRef}`);
    console.log(`   Poste: ${data.demandePoste}`);
    console.log(`   Délai: ${dateFormatee}`);
    console.log('');
    console.log(`🌐 VALIDER MAINTENANT: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'rappel' };
  },

  /**
   * Notification de changement de rôle
   */
  async sendRoleChangeNotification(data: RoleChangeEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 CHANGEMENT DE RÔLE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`Votre rôle a été modifié par ${data.changedBy}.`);
    console.log(`   Ancien rôle: ${data.oldRole}`);
    console.log(`   Nouveau rôle: ${data.newRole}`);
    console.log('');
    console.log(`ℹ️ Veuillez vous reconnecter pour que les changements prennent effet.`);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'role_change' };
  },

  /**
   * Email de désactivation de compte
   */
  async sendAccountDeactivationEmail(data: AccountDeactivationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('🔒 DÉSACTIVATION DE COMPTE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`Votre compte a été désactivé.`);
    console.log(`Raison: ${data.reason}`);
    if (data.reactivationDate) {
      console.log(`Réactivation prévue: ${data.reactivationDate}`);
    }
    console.log('');
    console.log(`ℹ️ Contactez l'administrateur pour plus d'informations.`);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'account_deactivation' };
  },

  /**
   * Email d'activation de compte
   */
  async sendAccountActivationEmail(data: AccountActivationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('🔓 ACTIVATION DE COMPTE');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`Votre compte a été activé !`);
    console.log(`Mot de passe temporaire: ${data.tempPassword}`);
    console.log('');
    console.log(`🌐 LIEN D'ACTIVATION: ${data.activationUrl}`);
    console.log('');
    console.log(`⚠️ Vous devrez changer ce mot de passe à la première connexion.`);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'account_activation' };
  },

  /**
   * Confirmation de mise à jour de profil
   */
  async sendProfileUpdateConfirmation(data: ProfileUpdateEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('📝 MISE À JOUR DU PROFIL');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`Votre profil a été mis à jour avec succès.`);
    console.log(`Champs modifiés: ${data.changes.join(', ')}`);
    console.log('');
    console.log(`🌐 CONSULTER VOTRE PROFIL: ${data.profileUrl}`);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'profile_update' };
  },

  /**
   * Notification simple
   */
  async sendNotificationEmail(data: NotificationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('🔔 NOTIFICATION');
    console.log('='.repeat(70));
    console.log(`À: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`${data.message}`);
    if (data.actionUrl) {
      console.log('');
      console.log(`🌐 LIEN D'ACTION: ${data.actionUrl}`);
    }
    console.log('='.repeat(70) + '\n');
    
    return { success: true, simulated: true, to: data.email, type: 'notification' };
  },
  async sendDisponibiliteRequest(data: DisponibiliteRequestData) {
  const roleLabel = data.role === 'MANAGER' ? 'Manager' : 'Directeur';
 
  console.log('\n' + '='.repeat(70));
  console.log('📅 SAISIE DE DISPONIBILITÉS REQUISE');
  console.log('='.repeat(70));
  console.log(`À: ${data.email}`);
  console.log(`Rôle: ${roleLabel}`);
  console.log('-'.repeat(70));
  console.log(`Bonjour ${data.prenom} ${data.nom},`);
  console.log('');
  console.log(`Une demande de recrutement a été soumise :`);
  console.log(`   Référence : ${data.demandeRef}`);
  console.log(`   Poste     : ${data.poste}`);
  console.log('');
  console.log(`En tant que ${roleLabel}, vous devez participer à l'entretien technique.`);
  console.log(`Merci de saisir vos disponibilités dans les meilleurs délais.`);
  console.log('');
  console.log(`🌐 SAISIR MES DISPONIBILITÉS : ${data.actionUrl}`);
  console.log('='.repeat(70) + '\n');
 
  return { success: true, simulated: true, to: data.email, type: 'disponibilite_request' };
},
 
// ============================================
// MÉTHODE 2 : Notification entretien planifié
// ============================================
// Envoyée à l'interviewer (MANAGER, DIRECTEUR ou DRH) quand le RH
// planifie un entretien sur un de ses créneaux.
 
async sendEntretienNotification(data: EntretienNotificationData) {
  const typeLabels: Record<string, string> = {
    RH: 'Entretien RH',
    TECHNIQUE: 'Entretien technique',
    DIRECTION: 'Entretien direction'
  };
 
  const dateFormatee = new Date(data.date).toLocaleDateString('fr-TN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
 
  console.log('\n' + '='.repeat(70));
  console.log('🗓️  ENTRETIEN PLANIFIÉ');
  console.log('='.repeat(70));
  console.log(`À: ${data.email}`);
  console.log('-'.repeat(70));
  console.log(`Bonjour ${data.prenom} ${data.nom},`);
  console.log('');
  console.log(`Un entretien a été planifié avec un candidat :`);
  console.log('');
  console.log(`   Type      : ${typeLabels[data.type] || data.type}`);
  console.log(`   Candidat  : ${data.candidatNom}`);
  console.log(`   Poste     : ${data.poste}`);
  console.log(`   Date      : ${dateFormatee}`);
  console.log(`   Heure     : ${data.heure}`);
  console.log(`   Lieu      : ${data.lieu}`);
  console.log('');
  console.log(`Après l'entretien, merci de saisir votre feedback.`);
  console.log('');
  console.log(`🌐 VOIR L'ENTRETIEN : ${data.actionUrl}`);
  console.log('='.repeat(70) + '\n');
 
  return { success: true, simulated: true, to: data.email, type: 'entretien_notification' };
},

  /**
   * Version simplifiée pour les logs
   */
  logEmail(type: string, to: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📧 EMAIL [${type}] → ${to}`);
  }
};