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
  role: string;
  actionUrl: string;
}

interface EntretienNotificationData {
  nom: string;
  prenom: string;
  email: string;
  candidatNom: string;
  poste: string;
  type: string;
  date: Date;
  heure: string;
  lieu: string;
  actionUrl: string;
}

// ============================================
// INTERFACES POUR PROCESSUS 2 (ÉVALUATION PE)
// ============================================

interface EvaluationNotificationData {
  nom: string;
  prenom: string;
  email: string;
  evaluationRef: string;
  employeNom: string;
  employePrenom: string;
  joursRestants: number;
  actionUrl: string;
}

interface EvaluationValidationNotificationData {
  nom: string;
  prenom: string;
  email: string;
  evaluationRef: string;
  employeNom: string;
  employePrenom: string;
  etape: number;
  totalEtapes: number;
  role: string;
  dateLimite: Date;
  actionUrl: string;
}

// ============================================
// EMAIL SERVICE
// ============================================

export const emailService = {
  async sendWelcomeEmail(data: WelcomeEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('EMAIL DE BIENVENUE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log(`Role: ${data.role}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre compte a ete cree sur Kilani RH.`);
    console.log('');
    console.log('IDENTIFIANTS TEMPORAIRES');
    console.log(`Email: ${data.email}`);
    console.log(`Mot de passe: ${data.tempPassword}`);
    console.log('');
    console.log(`LIEN DE CONNEXION: ${data.loginUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'welcome' };
  },

  async sendResetPasswordEmail(data: ResetPasswordEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('REINITIALISATION MOT DE PASSE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre mot de passe a ete reinitialise.`);
    console.log('');
    console.log('NOUVEAU MOT DE PASSE TEMPORAIRE');
    console.log(`${data.tempPassword}`);
    console.log('');
    console.log(`LIEN DE CONNEXION: ${data.loginUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'reset' };
  },

  async sendInvitationEmail(data: InvitationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('RENVOI D\'INVITATION');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log(`Role: ${data.role}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Vous avez ete invite a rejoindre Kilani RH.`);
    console.log('');
    console.log('IDENTIFIANTS DE CONNEXION');
    console.log(`Email: ${data.email}`);
    console.log(`Mot de passe temporaire: ${data.tempPassword}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'invitation' };
  },

  async sendValidationNotification(data: ValidationNotificationData) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const totalEtapesSafe = data.totalEtapes || 0;
    const etapeText = totalEtapesSafe > 0 ? `${data.etape}/${totalEtapesSafe}` : `Etape ${data.etape}`;
    console.log('\n' + '='.repeat(70));
    console.log('NOUVELLE VALIDATION ATTENDUE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log(`Role: ${data.role}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log('');
    console.log(`Une demande de recrutement est en attente de votre validation :`);
    console.log(`   Reference: ${data.demandeRef}`);
    console.log(`   Poste: ${data.demandePoste}`);
    console.log(`   Etape: ${etapeText}`);
    console.log(`   Delai: ${dateFormatee} (48h max)`);
    console.log(`LIEN D'ACTION: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'validation' };
  },

  async sendOffreGenereeNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; offreRef: string; poste: string; actionUrl: string }) {
    console.log('\n' + '='.repeat(70));
    console.log('OFFRE GENERE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`La demande ${data.demandeRef} a ete validee !`);
    console.log(`Une offre d'emploi a ete generee automatiquement :`);
    console.log(`   Reference offre: ${data.offreRef}`);
    console.log(`   Poste: ${data.poste}`);
    console.log(`LIEN VERS L'OFFRE: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'offre_generee' };
  },

  async sendRejetNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; poste: string; commentaire?: string; role: string }) {
    console.log('\n' + '='.repeat(70));
    console.log('DEMANDE REJETEE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`La demande ${data.demandeRef} a ete rejetee par ${data.role}.`);
    console.log(`   Poste: ${data.poste}`);
    if (data.commentaire) console.log(`   Commentaire: ${data.commentaire}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'rejet' };
  },

  async sendRappelNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; demandePoste: string; dateLimite: Date; actionUrl: string }) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN');
    console.log('\n' + '='.repeat(70));
    console.log('RAPPEL DE VALIDATION');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`RAPPEL : Une demande est en attente de votre validation !`);
    console.log(`   Reference: ${data.demandeRef}`);
    console.log(`   Poste: ${data.demandePoste}`);
    console.log(`   Delai: ${dateFormatee}`);
    console.log(`VALIDER MAINTENANT: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'rappel' };
  },

  async sendRoleChangeNotification(data: RoleChangeEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('CHANGEMENT DE ROLE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre role a ete modifie par ${data.changedBy}.`);
    console.log(`   Ancien role: ${data.oldRole}`);
    console.log(`   Nouveau role: ${data.newRole}`);
    console.log(`Veuillez vous reconnecter pour que les changements prennent effet.`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'role_change' };
  },

  async sendAccountDeactivationEmail(data: AccountDeactivationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('DESACTIVATION DE COMPTE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre compte a ete desactive.`);
    console.log(`Raison: ${data.reason}`);
    if (data.reactivationDate) console.log(`Reactivation prevue: ${data.reactivationDate}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'account_deactivation' };
  },

  async sendAccountActivationEmail(data: AccountActivationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('ACTIVATION DE COMPTE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre compte a ete active !`);
    console.log(`Mot de passe temporaire: ${data.tempPassword}`);
    console.log(`LIEN D'ACTIVATION: ${data.activationUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'account_activation' };
  },

  async sendProfileUpdateConfirmation(data: ProfileUpdateEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('MISE A JOUR DU PROFIL');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Votre profil a ete mis a jour avec succes.`);
    console.log(`Champs modifies: ${data.changes.join(', ')}`);
    console.log(`CONSULTER VOTRE PROFIL: ${data.profileUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'profile_update' };
  },

  async sendNotificationEmail(data: NotificationEmailData) {
    console.log('\n' + '='.repeat(70));
    console.log('NOTIFICATION');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`${data.message}`);
    if (data.actionUrl) console.log(`LIEN D'ACTION: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'notification' };
  },

  async sendDisponibiliteRequest(data: DisponibiliteRequestData) {
    const roleLabel = data.role === 'MANAGER' ? 'Manager' : 'Directeur';
    console.log('\n' + '='.repeat(70));
    console.log('SAISIE DE DISPONIBILITES REQUISE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log(`Role: ${roleLabel}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Une demande de recrutement a ete soumise :`);
    console.log(`   Reference : ${data.demandeRef}`);
    console.log(`   Poste     : ${data.poste}`);
    console.log(`En tant que ${roleLabel}, vous devez participer a l'entretien technique.`);
    console.log(`SAISIR MES DISPONIBILITES : ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'disponibilite_request' };
  },

  async sendEntretienNotification(data: EntretienNotificationData) {
    const typeLabels: Record<string, string> = {
      RH: 'Entretien RH', TECHNIQUE: 'Entretien technique', DIRECTION: 'Entretien direction'
    };
    const dateFormatee = new Date(data.date).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    console.log('\n' + '='.repeat(70));
    console.log('ENTRETIEN PLANIFIE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Un entretien a ete planifie avec un candidat :`);
    console.log(`   Type      : ${typeLabels[data.type] || data.type}`);
    console.log(`   Candidat  : ${data.candidatNom}`);
    console.log(`   Poste     : ${data.poste}`);
    console.log(`   Date      : ${dateFormatee}`);
    console.log(`   Heure     : ${data.heure}`);
    console.log(`   Lieu      : ${data.lieu}`);
    console.log(`VOIR L'ENTRETIEN : ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'entretien_notification' };
  },

  // ============================================
  // METHODES POUR PROCESSUS 2 (ÉVALUATION PE)
  // ============================================

  async sendEvaluationNotification(data: EvaluationNotificationData) {
    console.log('\n' + '='.repeat(70));
    console.log('NOUVELLE EVALUATION PERIODE D\'ESSAI');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Une evaluation de fin de periode d'essai est a realiser :`);
    console.log(`   Reference: ${data.evaluationRef}`);
    console.log(`   Employe: ${data.employePrenom} ${data.employeNom}`);
    console.log(`   Jours restants: ${data.joursRestants}j`);
    console.log(`LIEN VERS L'EVALUATION: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'evaluation' };
  },

  async sendEvaluationValidationNotification(data: EvaluationValidationNotificationData) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    console.log('\n' + '='.repeat(70));
    console.log('VALIDATION D\'EVALUATION ATTENDUE');
    console.log('='.repeat(70));
    console.log(`A: ${data.email}`);
    console.log(`Role: ${data.role}`);
    console.log('-'.repeat(70));
    console.log(`Bonjour ${data.prenom} ${data.nom},`);
    console.log(`Une evaluation de periode d'essai est en attente de votre validation :`);
    console.log(`   Reference: ${data.evaluationRef}`);
    console.log(`   Employe: ${data.employePrenom} ${data.employeNom}`);
    console.log(`   Etape: ${data.etape}/${data.totalEtapes}`);
    console.log(`   Delai: ${dateFormatee} (48h max)`);
    console.log(`LIEN D'ACTION: ${data.actionUrl}`);
    console.log('='.repeat(70) + '\n');
    return { success: true, simulated: true, to: data.email, type: 'evaluation_validation' };
  },

  logEmail(type: string, to: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] EMAIL [${type}] → ${to}`);
  }
};