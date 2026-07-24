// backend/src/services/email.service.ts

import nodemailer from 'nodemailer';


// INTERFACES

interface LienPlanificationCandidatData {
  nomCandidat: string;
  prenomCandidat: string;
  emailCandidat: string;
  poste: string;
  type: 'RH' | 'TECHNIQUE' | 'DIRECTION';
  lienPlanification: string;
}
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
interface FicheRenseignementEmailData {
  nom: string;
  prenom: string;
  email: string;
  ficheUrl: string;
  poste: string;
}

interface FicheRecueNotificationData {
  nom: string;
  prenom: string;
  email: string;
  candidatNom: string;
  actionUrl: string;
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

interface EntretienCandidatEmailData {
  nomCandidat: string;
  prenomCandidat: string;
  emailCandidat: string;
  poste: string;
  type: string;
  date: Date;
  heure: string;
  lieu: string;
  interviewerNom: string;
  interviewerRole: string;
}

interface EntretienModifieEmailData {
  nom: string;
  prenom: string;
  email: string;
  poste: string;
  type: string;
  ancienneDate: Date;
  nouvelleDate: Date;
  nouvelleHeure: string;
  nouveauLieu: string;
  actionUrl?: string;
}

interface EntretienModifieCandidatEmailData {
  nomCandidat: string;
  prenomCandidat: string;
  emailCandidat: string;
  poste: string;
  type: string;
  ancienneDate: Date;
  nouvelleDate: Date;
  nouvelleHeure: string;
  nouveauLieu: string;
}

interface FeedbackDisponibleEmailData {
  nom: string;
  prenom: string;
  email: string;
  candidatNom: string;
  poste: string;
  typeEntretien: string;
  evaluation: number;
  actionUrl: string;
}

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

interface ContratEmailData {
  nom: string;
  prenom: string;
  email: string;
  contratRef: string;
  typeContrat: string;
  poste: string;
  dateDebut: Date;
  salaire: number | string;
  consultationUrl: string;
}

interface ContratSigneEmailData {
  nom: string;
  prenom: string;
  email: string;
  contratRef: string;
  typeContrat: string;
  dateDebut: Date;
  periodeEssaiFin: Date;
  consultationUrl: string;
}
interface AvenantEmailData {
  nom: string;
  prenom: string;
  email: string;
  contratRef: string;
  typeAvenant: string;
  description: string;
  nouveauSalaire?: string;
  nouvelleDateFin?: Date;
  consultationUrl: string;
  
}

// CONFIGURATION SMTP


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // false pour le port 587 (STARTTLS géré automatiquement par Gmail)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const fromEmail = process.env.SMTP_FROM || 'noreply@kilani.tn';

transporter.verify((error, success) => {
  if (error) {
    console.error(' SMTP Connection Error:', error);
  } else {
    console.log(' SMTP Server is ready to send emails');
  }
});


// FONCTION UTILITAIRE


const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html
    });
    console.log(` Email sent: ${info.messageId} to ${to}`);
    return true;
  } catch (error) {
    // Ne jamais laisser une erreur SMTP (rate-limit Mailtrap, etc.) faire
    // planter le flux métier appelant (creation d'entretien, validation, etc.)
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};


// EMAIL SERVICE


export const emailService = {

  // ── USER ────────────────────────────────────────────────────────────────────

  async sendWelcomeEmail(data: WelcomeEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4CAF50;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Bienvenue sur Kilani RH</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Votre compte a été créé avec le rôle <strong>${data.role}</strong>.</p>
        <div class="card">
          <p><strong>Email :</strong> ${data.email}</p>
          <p><strong>Mot de passe temporaire :</strong> ${data.tempPassword}</p>
        </div>
        <p>Veuillez changer votre mot de passe lors de votre première connexion.</p>
        <p style="text-align:center"><a href="${data.loginUrl}" class="button">Se connecter</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Bienvenue sur Kilani RH', html);
    return { success: true, to: data.email, type: 'welcome' };
  },

  async sendResetPasswordEmail(data: ResetPasswordEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#ff9800;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#ff9800;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Réinitialisation de mot de passe</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Votre mot de passe a été réinitialisé.</p>
        <div class="card"><p><strong>Nouveau mot de passe temporaire :</strong> ${data.tempPassword}</p></div>
        <p style="text-align:center"><a href="${data.loginUrl}" class="button">Se connecter</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Réinitialisation de mot de passe', html);
    return { success: true, to: data.email, type: 'reset' };
  },

  async sendInvitationEmail(data: InvitationEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#2196F3;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#2196F3;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Invitation à rejoindre Kilani RH</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Vous avez été invité(e) en tant que <strong>${data.role}</strong>.</p>
        <div class="card">
          <p><strong>Email :</strong> ${data.email}</p>
          <p><strong>Mot de passe temporaire :</strong> ${data.tempPassword}</p>
        </div>
        <p style="text-align:center"><a href="${data.loginUrl}" class="button">Activer mon compte</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Invitation à rejoindre Kilani RH', html);
    return { success: true, to: data.email, type: 'invitation' };
  },

  async sendRoleChangeNotification(data: RoleChangeEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#2196F3;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Changement de rôle</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Votre rôle a été modifié par <strong>${data.changedBy}</strong>.</p>
        <div class="card">
          <div class="card-row"><span>Ancien rôle</span><strong>${data.oldRole}</strong></div>
          <div class="card-row"><span>Nouveau rôle</span><strong>${data.newRole}</strong></div>
        </div>
        <p><strong>Important :</strong> Déconnectez-vous et reconnectez-vous pour que les changements prennent effet.</p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Changement de rôle — Kilani RH', html);
    return { success: true, to: data.email, type: 'role_change' };
  },

  async sendAccountDeactivationEmail(data: AccountDeactivationEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#f44336;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Désactivation de compte</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Votre compte a été désactivé.</p>
        <p><strong>Raison :</strong> ${data.reason}</p>
        ${data.reactivationDate ? `<p><strong>Réactivation prévue :</strong> ${data.reactivationDate}</p>` : ''}
        <p>Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.</p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Désactivation de compte — Kilani RH', html);
    return { success: true, to: data.email, type: 'account_deactivation' };
  },

  async sendAccountActivationEmail(data: AccountActivationEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4CAF50;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Réactivation de compte</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Votre compte a été réactivé !</p>
        <div class="card"><p><strong>Mot de passe temporaire :</strong> ${data.tempPassword}</p></div>
        <p style="text-align:center"><a href="${data.activationUrl}" class="button">Activer mon compte</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Réactivation de compte — Kilani RH', html);
    return { success: true, to: data.email, type: 'account_activation' };
  },

  async sendProfileUpdateConfirmation(data: ProfileUpdateEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4CAF50;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Mise à jour du profil</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Votre profil a été mis à jour.</p>
        <div class="card">
          <strong>Modifications :</strong>
          <ul>${data.changes.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
        <p style="text-align:center"><a href="${data.profileUrl}" class="button">Consulter mon profil</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Mise à jour du profil — Kilani RH', html);
    return { success: true, to: data.email, type: 'profile_update' };
  },

  // ── DEMANDE (utilisé par n8n) ────────────────────────────────────────────────

  async sendValidationNotification(data: ValidationNotificationData) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const totalEtapesSafe = data.totalEtapes || 0;
    const etapeText = totalEtapesSafe > 0 ? `${data.etape}/${totalEtapesSafe}` : `Étape ${data.etape}`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#f44336;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border-left:4px solid #f44336;padding:16px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Nouvelle validation requise</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Une demande de recrutement est en attente de votre validation.</p>
        <div class="card">
          <div class="card-row"><span>Référence</span><strong>${data.demandeRef}</strong></div>
          <div class="card-row"><span>Poste</span><strong>${data.demandePoste}</strong></div>
          <div class="card-row"><span>Étape</span><strong>${etapeText}</strong></div>
          <div class="card-row"><span>Votre rôle</span><strong>${data.role}</strong></div>
          <div class="card-row"><span>Délai limite</span><strong>${dateFormatee}</strong></div>
        </div>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Valider la demande</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Validation demande ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'validation' };
  },

  async sendOffreGenereeNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; offreRef: string; poste: string; actionUrl: string }) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4CAF50;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Offre générée automatiquement</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>La demande <strong>${data.demandeRef}</strong> a été validée. Une offre d'emploi a été générée :</p>
        <div class="card">
          <p><strong>Référence offre :</strong> ${data.offreRef}</p>
          <p><strong>Poste :</strong> ${data.poste}</p>
        </div>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Voir l'offre</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Offre générée — ${data.offreRef}`, html);
    return { success: true, to: data.email, type: 'offre_generee' };
  },

  async sendRejetNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; poste: string; commentaire?: string; role: string }) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#f44336;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .comment{background:#fff3cd;border-left:4px solid #ffc107;padding:14px;margin:16px 0}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Demande rejetée</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>La demande <strong>${data.demandeRef}</strong> pour le poste <strong>${data.poste}</strong> a été rejetée par <strong>${data.role}</strong>.</p>
        ${data.commentaire ? `<div class="comment"><strong>Commentaire :</strong><p>${data.commentaire}</p></div>` : ''}
        <p>Vous pouvez modifier votre demande et la soumettre à nouveau.</p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Demande rejetée — ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'rejet' };
  },

  async sendRappelNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; demandePoste: string; dateLimite: Date; actionUrl: string }) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#ff9800;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:14px;margin:16px 0}
      .button{background:#ff9800;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Rappel de validation</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <div class="warning"><strong>RAPPEL :</strong> Une demande est en attente de votre validation !</div>
        <p><strong>Référence :</strong> ${data.demandeRef}<br>
        <strong>Poste :</strong> ${data.demandePoste}<br>
        <strong>Délai limite :</strong> ${dateFormatee}</p>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Valider maintenant</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Rappel validation — ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'rappel' };
  },

  // ── ENTRETIEN ────────────────────────────────────────────────────────────────

  async sendDisponibiliteRequest(data: DisponibiliteRequestData) {
    const roleLabel = data.role === 'MANAGER' ? 'Manager' : 'Directeur';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#ff9800;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .button{background:#ff9800;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Saisie de disponibilités requise</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Une demande de recrutement a été soumise :</p>
        <p><strong>Référence :</strong> ${data.demandeRef}<br><strong>Poste :</strong> ${data.poste}</p>
        <p>En tant que <strong>${roleLabel}</strong>, vous devez participer à l'entretien technique.</p>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Saisir mes disponibilités</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Disponibilités requises — ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'disponibilite_request' };
  },


async sendFicheRenseignement(data: FicheRenseignementEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#2196F3;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#2196F3;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Fiche de renseignement</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Suite à votre candidature pour le poste de <strong>${data.poste}</strong>, merci de compléter votre fiche de renseignement avant la suite du processus de recrutement.</p>
        <p style="text-align:center"><a href="${data.ficheUrl}" class="button">Compléter ma fiche</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe — Ressources Humaines</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Fiche de renseignement — ${data.poste}`, html);
    return { success: true, to: data.email, type: 'fiche_renseignement' };
  },

  async sendFicheRecueNotification(data: FicheRecueNotificationData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#2196F3;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .button{background:#2196F3;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Fiche de renseignement reçue</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Le candidat <strong>${data.candidatNom}</strong> a soumis sa fiche de renseignement. Vous pouvez maintenant planifier son entretien.</p>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Voir le candidat</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Fiche reçue — ${data.candidatNom}`, html);
    return { success: true, to: data.email, type: 'fiche_recue_notification' };
  },
async sendLienPlanificationCandidatEmail(data: LienPlanificationCandidatData) {
  const typeLabels: Record<string, string> = {
    RH: 'entretien RH', TECHNIQUE: 'entretien technique', DIRECTION: 'entretien Direction'
  };
  const interlocuteurLabel = data.type === 'TECHNIQUE' ? 'notre manager'
    : data.type === 'DIRECTION' ? 'notre direction'
    : 'notre équipe RH';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:#2c2416;color:#c9a84c;padding:24px;text-align:center}
    .header h1{margin:0;font-size:22px}
    .content{padding:24px;background:#f9f9f9}
    .notice{background:#e3f2fd;border-left:4px solid #2196F3;padding:14px;margin:16px 0;border-radius:0 6px 6px 0}
    .button{background:#c9a84c;color:#2c2416!important;padding:14px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
    .footer{text-align:center;padding:16px;font-size:12px;color:#888}
  </style></head><body>
  <div class="container">
    <div class="header"><h1>Choisissez votre creneau d'entretien</h1></div>
    <div class="content">
      <p>Bonjour <strong>${data.prenomCandidat} ${data.nomCandidat}</strong>,</p>
      <p>Suite a votre candidature pour le poste de <strong>${data.poste}</strong>, nous souhaitons vous rencontrer pour un <strong>${typeLabels[data.type]}</strong> avec ${interlocuteurLabel}.</p>
      <p>Merci de choisir le creneau qui vous convient parmi les disponibilites proposees :</p>
      <p style="text-align:center;margin:24px 0"><a href="${data.lienPlanification}" class="button">Choisir mon creneau</a></p>
      <div class="notice">L'entretien se deroule en presentiel a nos locaux. L'adresse exacte vous sera confirmee une fois votre creneau choisi.</div>
      <p style="font-size:12px;color:#888">Ce lien est personnel, valable 7 jours. Si vous ne pouvez pas y acceder, contactez-nous directement.</p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe — Ressources Humaines</p></div>
  </div></body></html>`;

  await sendEmail(data.emailCandidat, `Choisissez votre creneau — ${data.poste}`, html);
  return { success: true, to: data.emailCandidat, type: 'lien_planification_candidat' };
},
  async sendEntretienNotification(data: EntretienNotificationData) {
    const typeLabels: Record<string, string> = {
      RH: 'Entretien RH', TECHNIQUE: 'Entretien technique', DIRECTION: 'Entretien Direction'
    };
    const dateFormatee = new Date(data.date).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4CAF50;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Entretien planifié</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Un entretien a été planifié :</p>
        <div class="card">
          <div class="card-row"><span>Type</span><strong>${typeLabels[data.type] || data.type}</strong></div>
          <div class="card-row"><span>Candidat</span><strong>${data.candidatNom}</strong></div>
          <div class="card-row"><span>Poste</span><strong>${data.poste}</strong></div>
          <div class="card-row"><span>Date</span><strong>${dateFormatee}</strong></div>
          <div class="card-row"><span>Heure</span><strong>${data.heure}</strong></div>
          <div class="card-row"><span>Lieu</span><strong>${data.lieu}</strong></div>
        </div>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Voir l'entretien</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Entretien planifié — ${data.candidatNom}`, html);
    return { success: true, to: data.email, type: 'entretien_notification' };
  },

  async sendEntretienCandidatEmail(data: EntretienCandidatEmailData) {
    const typeLabels: Record<string, string> = {
      RH: 'Entretien RH', TECHNIQUE: 'Entretien technique', DIRECTION: 'Entretien Direction'
    };
    const dateFormatee = new Date(data.date).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4CAF50;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .notice{background:#e3f2fd;border-left:4px solid #2196F3;padding:14px;margin:16px 0;border-radius:0 6px 6px 0}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Invitation à un entretien</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenomCandidat} ${data.nomCandidat}</strong>,</p>
        <p>Suite à votre candidature pour le poste de <strong>${data.poste}</strong>, nous avons le plaisir de vous inviter à un entretien.</p>
        <div class="card">
          <div class="card-row"><span>Type</span><strong>${typeLabels[data.type] || data.type}</strong></div>
          <div class="card-row"><span>Date</span><strong>${dateFormatee}</strong></div>
          <div class="card-row"><span>Heure</span><strong>${data.heure}</strong></div>
          <div class="card-row"><span>Lieu</span><strong>${data.lieu}</strong></div>
          <div class="card-row"><span>Interlocuteur</span><strong>${data.interviewerNom}</strong></div>
        </div>
        <div class="notice"><strong> À prévoir</strong><br>Merci de vous présenter 10 minutes avant l'heure prévue avec une pièce d'identité et votre CV.</div>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe — Ressources Humaines</p></div>
    </div></body></html>`;
    await sendEmail(data.emailCandidat, `Invitation à un entretien — ${data.poste}`, html);
    return { success: true, to: data.emailCandidat, type: 'entretien_candidat' };
  },

  async sendEntretienModifieInterviewerEmail(data: EntretienModifieEmailData) {
    const typeLabels: Record<string, string> = {
      RH: 'Entretien RH', TECHNIQUE: 'Entretien technique', DIRECTION: 'Entretien Direction'
    };
    const ancienneDateFormatee = new Date(data.ancienneDate).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const nouvelleDateFormatee = new Date(data.nouvelleDate).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#ff9800;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .old{color:#999;text-decoration:line-through;font-size:12px}
      .new{color:#4CAF50;font-weight:bold}
      .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:14px;margin:16px 0}
      .button{background:#ff9800;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1> Entretien modifié</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>L'entretien <strong>${typeLabels[data.type] || data.type}</strong> pour le poste <strong>${data.poste}</strong> a été modifié.</p>
        <div class="card">
          <div class="card-row"><span>Ancienne date</span><span class="old">${ancienneDateFormatee}</span></div>
          <div class="card-row"><span>Nouvelle date</span><span class="new">${nouvelleDateFormatee}</span></div>
          <div class="card-row"><span>Nouvelle heure</span><span class="new">${data.nouvelleHeure}</span></div>
          <div class="card-row"><span>Nouveau lieu</span><span class="new">${data.nouveauLieu}</span></div>
        </div>
        <div class="warning">Merci de mettre à jour votre agenda.</div>
        ${data.actionUrl ? `<p style="text-align:center"><a href="${data.actionUrl}" class="button">Voir l'entretien</a></p>` : ''}
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Entretien modifié — ${data.poste}`, html);
    return { success: true, to: data.email, type: 'entretien_modifie_interviewer' };
  },

  async sendEntretienModifieCandidatEmail(data: EntretienModifieCandidatEmailData) {
    const typeLabels: Record<string, string> = {
      RH: 'Entretien RH', TECHNIQUE: 'Entretien technique', DIRECTION: 'Entretien Direction'
    };
    const ancienneDateFormatee = new Date(data.ancienneDate).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const nouvelleDateFormatee = new Date(data.nouvelleDate).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#ff9800;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .old{color:#999;text-decoration:line-through;font-size:12px}
      .new{color:#4CAF50;font-weight:bold}
      .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:14px;margin:16px 0}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1> Modification de votre entretien</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenomCandidat} ${data.nomCandidat}</strong>,</p>
        <p>Votre entretien pour le poste de <strong>${data.poste}</strong> a été modifié.</p>
        <div class="card">
          <div class="card-row"><span>Type</span><strong>${typeLabels[data.type] || data.type}</strong></div>
          <div class="card-row"><span>Ancienne date</span><span class="old">${ancienneDateFormatee}</span></div>
          <div class="card-row"><span>Nouvelle date</span><span class="new">${nouvelleDateFormatee}</span></div>
          <div class="card-row"><span>Nouvelle heure</span><span class="new">${data.nouvelleHeure}</span></div>
          <div class="card-row"><span>Nouveau lieu</span><span class="new">${data.nouveauLieu}</span></div>
        </div>
        <div class="warning">En cas d'empêchement, contactez-nous dès que possible.</div>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe — Ressources Humaines</p></div>
    </div></body></html>`;
    await sendEmail(data.emailCandidat, `Modification de votre entretien — ${data.poste}`, html);
    return { success: true, to: data.emailCandidat, type: 'entretien_modifie_candidat' };
  },

  async sendFeedbackDisponibleEmail(data: FeedbackDisponibleEmailData) {
    const typeLabels: Record<string, string> = {
      RH: 'Entretien RH', TECHNIQUE: 'Entretien technique', DIRECTION: 'Entretien Direction'
    };
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#2196F3;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .score{font-size:32px;font-weight:bold;color:#2196F3;text-align:center;padding:16px}
      .button{background:#2196F3;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Nouveau feedback disponible</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Un feedback vient d'être soumis.</p>
        <div class="card">
          <div class="card-row"><span>Candidat</span><strong>${data.candidatNom}</strong></div>
          <div class="card-row"><span>Poste</span><strong>${data.poste}</strong></div>
          <div class="card-row"><span>Type d'entretien</span><strong>${typeLabels[data.typeEntretien] || data.typeEntretien}</strong></div>
          <div class="score">${data.evaluation} / 10</div>
        </div>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Voir le feedback</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Feedback disponible — ${data.candidatNom}`, html);
    return { success: true, to: data.email, type: 'feedback_disponible' };
  },

  // ── CONTRAT ──────────────────────────────────────────────────────────────────

  async sendContratEmail(data: ContratEmailData) {
    const dateFormatee = new Date(data.dateDebut).toLocaleDateString('fr-TN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#2196F3;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .header p{margin:6px 0 0;opacity:.9;font-size:14px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .notice{background:#fff3cd;border-left:4px solid #ffc107;padding:14px;margin:16px 0;border-radius:0 6px 6px 0}
      .button{background:#2196F3;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header">
        <h1>Votre contrat de travail</h1>
        <p>Kilani Groupe — Ressources Humaines</p>
      </div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Nous avons le plaisir de vous transmettre votre contrat de travail pour consultation.</p>
        <div class="card">
          <div class="card-row"><span>Référence</span><strong>${data.contratRef}</strong></div>
          <div class="card-row"><span>Type de contrat</span><strong>${data.typeContrat}</strong></div>
          <div class="card-row"><span>Poste</span><strong>${data.poste}</strong></div>
          <div class="card-row"><span>Prise de poste</span><strong>${dateFormatee}</strong></div>
          <div class="card-row"><span>Salaire brut mensuel</span><strong>${data.salaire} TND</strong></div>
        </div>
        <div class="notice"><strong> Prochaine étape</strong><br>La signature définitive se fera physiquement au siège social.</div>
        <p style="text-align:center"><a href="${data.consultationUrl}" class="button">Consulter mon contrat</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Votre contrat de travail — ${data.contratRef}`, html);
    return { success: true, to: data.email, type: 'contrat_envoi' };
  },

  async sendContratSigneEmail(data: ContratSigneEmailData) {
    const dateDebutFormatee = new Date(data.dateDebut).toLocaleDateString('fr-TN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const datePEFormatee = new Date(data.periodeEssaiFin).toLocaleDateString('fr-TN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4CAF50;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .success{background:#e8f5e9;border-left:4px solid #4CAF50;padding:14px;margin:16px 0;border-radius:0 6px 6px 0}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1> Bienvenue chez Kilani Groupe !</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Félicitations ! Votre contrat <strong>${data.contratRef}</strong> est maintenant actif.</p>
        <div class="card">
          <div class="card-row"><span>Type de contrat</span><strong>${data.typeContrat}</strong></div>
          <div class="card-row"><span>Prise de poste</span><strong>${dateDebutFormatee}</strong></div>
          <div class="card-row"><span>Fin de période d'essai</span><strong>${datePEFormatee}</strong></div>
        </div>
        <div class="success"><strong> Période d'essai</strong><br>Une évaluation sera planifiée avant le <strong>${datePEFormatee}</strong>.</div>
        <p style="text-align:center"><a href="${data.consultationUrl}" class="button">Consulter mon contrat</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Contrat actif — Bienvenue chez Kilani Groupe', html);
    return { success: true, to: data.email, type: 'contrat_signe' };
  },
async sendAvenantEmail(data: AvenantEmailData) {
  const dateFinFormatee = data.nouvelleDateFin
    ? new Date(data.nouvelleDateFin).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:#2196F3;color:white;padding:24px;text-align:center}
    .header h1{margin:0;font-size:22px}
    .content{padding:24px;background:#f9f9f9}
    .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
    .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
    .card-row:last-child{border-bottom:none}
    .notice{background:#e3f2fd;border-left:4px solid #2196F3;padding:14px;margin:16px 0;border-radius:0 6px 6px 0}
    .button{background:#2196F3;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
    .footer{text-align:center;padding:16px;font-size:12px;color:#888}
  </style></head><body>
  <div class="container">
    <div class="header"><h1>Modification de votre contrat</h1></div>
    <div class="content">
      <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
      <p>Votre contrat <strong>${data.contratRef}</strong> a fait l'objet d'un avenant.</p>
      <div class="card">
        <div class="card-row"><span>Type</span><strong>${data.typeAvenant}</strong></div>
        ${data.nouveauSalaire ? `<div class="card-row"><span>Nouveau salaire</span><strong>${data.nouveauSalaire}</strong></div>` : ''}
        ${dateFinFormatee ? `<div class="card-row"><span>Nouvelle date de fin</span><strong>${dateFinFormatee}</strong></div>` : ''}
      </div>
      <div class="notice"><strong>Détail</strong><br>${data.description}</div>
      <p style="text-align:center"><a href="${data.consultationUrl}" class="button">Consulter mon contrat à jour</a></p>
    </div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
  </div></body></html>`;

  await sendEmail(data.email, `Avenant à votre contrat — ${data.contratRef}`, html);
  return { success: true, to: data.email, type: 'avenant' };
},
  // ── ÉVALUATION PE ────────────────────────────────────────────────────────────

  async sendEvaluationNotification(data: EvaluationNotificationData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#ff9800;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:14px;margin:16px 0}
      .button{background:#ff9800;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Évaluation période d'essai</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <div class="warning">Une évaluation de fin de période d'essai est à réaliser.</div>
        <div class="card">
          <div class="card-row"><span>Référence</span><strong>${data.evaluationRef}</strong></div>
          <div class="card-row"><span>Employé</span><strong>${data.employePrenom} ${data.employeNom}</strong></div>
          <div class="card-row"><span>Jours restants</span><strong>${data.joursRestants} jours</strong></div>
        </div>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Réaliser l'évaluation</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Évaluation période d'essai — ${data.evaluationRef}`, html);
    return { success: true, to: data.email, type: 'evaluation' };
  },

  async sendEvaluationValidationNotification(data: EvaluationValidationNotificationData) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#f44336;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:20px;margin:16px 0}
      .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
      .card-row:last-child{border-bottom:none}
      .button{background:#4CAF50;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Validation d'évaluation requise</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Une évaluation de période d'essai est en attente de votre validation.</p>
        <div class="card">
          <div class="card-row"><span>Référence</span><strong>${data.evaluationRef}</strong></div>
          <div class="card-row"><span>Employé</span><strong>${data.employePrenom} ${data.employeNom}</strong></div>
          <div class="card-row"><span>Étape</span><strong>${data.etape}/${data.totalEtapes}</strong></div>
          <div class="card-row"><span>Votre rôle</span><strong>${data.role}</strong></div>
          <div class="card-row"><span>Délai</span><strong>${dateFormatee}</strong></div>
        </div>
        <p style="text-align:center"><a href="${data.actionUrl}" class="button">Valider l'évaluation</a></p>
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, `Validation évaluation — ${data.evaluationRef}`, html);
    return { success: true, to: data.email, type: 'evaluation_validation' };
  },

  // ── GÉNÉRIQUE ────────────────────────────────────────────────────────────────

  async sendNotificationEmail(data: NotificationEmailData) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#2196F3;color:white;padding:24px;text-align:center}
      .header h1{margin:0;font-size:22px}
      .content{padding:24px;background:#f9f9f9}
      .button{background:#2196F3;color:white!important;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold}
      .footer{text-align:center;padding:16px;font-size:12px;color:#888}
    </style></head><body>
    <div class="container">
      <div class="header"><h1>Notification</h1></div>
      <div class="content">
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>${data.message}</p>
        ${data.actionUrl ? `<p style="text-align:center"><a href="${data.actionUrl}" class="button">Voir plus</a></p>` : ''}
      </div>
      <div class="footer"><p>&copy; ${new Date().getFullYear()} Kilani Groupe</p></div>
    </div></body></html>`;
    await sendEmail(data.email, 'Notification — Kilani RH', html);
    return { success: true, to: data.email, type: 'notification' };
  },

  logEmail(type: string, to: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] EMAIL [${type}] → ${to}`);
  }
};
