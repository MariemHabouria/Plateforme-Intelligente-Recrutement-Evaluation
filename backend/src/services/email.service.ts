// backend/src/services/email.service.ts

import nodemailer from 'nodemailer';

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
// CONFIGURATION SMTP
// ============================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const fromEmail = process.env.SMTP_FROM || 'noreply@kilani.tn';

// Vérifier la connexion au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to send emails');
  }
});

// ============================================
// FONCTION UTILITAIRE POUR ENVOYER DES EMAILS
// ============================================

const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: to,
      subject: subject,
      html: html
    });
    console.log(`Email sent: ${info.messageId} to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};

// ============================================
// EMAIL SERVICE
// ============================================

export const emailService = {
  async sendWelcomeEmail(data: WelcomeEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .credentials { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bienvenue sur Kilani RH</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Votre compte a été créé sur Kilani RH avec le rôle <strong>${data.role}</strong>.</p>
            <div class="credentials">
              <h3>Identifiants temporaires</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Mot de passe temporaire:</strong> ${data.tempPassword}</p>
            </div>
            <p>Pour des raisons de sécurité, veuillez changer votre mot de passe lors de votre première connexion.</p>
            <p style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Se connecter</a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Bienvenue sur Kilani RH', html);
    return { success: true, to: data.email, type: 'welcome' };
  },

  async sendResetPasswordEmail(data: ResetPasswordEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .credentials { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Réinitialisation de mot de passe</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Votre mot de passe a été réinitialisé.</p>
            <div class="credentials">
              <h3>Nouveau mot de passe temporaire</h3>
              <p><strong>${data.tempPassword}</strong></p>
            </div>
            <p>Pour des raisons de sécurité, veuillez changer votre mot de passe lors de votre prochaine connexion.</p>
            <p style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Se connecter</a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Réinitialisation de mot de passe', html);
    return { success: true, to: data.email, type: 'reset' };
  },

  async sendInvitationEmail(data: InvitationEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .credentials { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invitation à rejoindre Kilani RH</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Vous avez été invité à rejoindre Kilani RH en tant que <strong>${data.role}</strong>.</p>
            <div class="credentials">
              <h3>Vos identifiants de connexion</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Mot de passe temporaire:</strong> ${data.tempPassword}</p>
            </div>
            <p>Nous vous invitons à vous connecter et à compléter votre profil.</p>
            <p style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Activer mon compte</a>
            </p>
          </div>
          <div class="footer">
            <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Invitation à rejoindre Kilani RH', html);
    return { success: true, to: data.email, type: 'invitation' };
  },

  async sendValidationNotification(data: ValidationNotificationData) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const totalEtapesSafe = data.totalEtapes || 0;
    const etapeText = totalEtapesSafe > 0 ? `${data.etape}/${totalEtapesSafe}` : `Étape ${data.etape}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .info { background-color: #fff; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouvelle validation requise</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Une demande de recrutement est en attente de votre validation :</p>
            <div class="info">
              <p><strong>Référence:</strong> ${data.demandeRef}</p>
              <p><strong>Poste:</strong> ${data.demandePoste}</p>
              <p><strong>Étape:</strong> ${etapeText}</p>
              <p><strong>Votre rôle:</strong> ${data.role}</p>
              <p><strong>Délai:</strong> ${dateFormatee} (48h maximum)</p>
            </div>
            <p style="text-align: center;">
              <a href="${data.actionUrl}" class="button">Valider la demande</a>
            </p>
            <p><small>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : ${data.actionUrl}</small></p>
          </div>
          <div class="footer">
            <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Validation demande ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'validation' };
  },

  async sendOffreGenereeNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; offreRef: string; poste: string; actionUrl: string }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Offre générée automatiquement</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>La demande <strong>${data.demandeRef}</strong> a été validée !</p>
            <p>Une offre d'emploi a été générée automatiquement :</p>
            <ul>
              <li><strong>Référence offre:</strong> ${data.offreRef}</li>
              <li><strong>Poste:</strong> ${data.poste}</li>
            </ul>
            <p style="text-align: center;">
              <a href="${data.actionUrl}" class="button">Voir l'offre</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Offre générée - ${data.offreRef}`, html);
    return { success: true, to: data.email, type: 'offre_generee' };
  },

  async sendRejetNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; poste: string; commentaire?: string; role: string }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .comment { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Demande rejetée</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>La demande <strong>${data.demandeRef}</strong> a été rejetée par <strong>${data.role}</strong>.</p>
            <ul>
              <li><strong>Poste:</strong> ${data.poste}</li>
            </ul>
            ${data.commentaire ? `
              <div class="comment">
                <strong>Commentaire du rejet :</strong>
                <p>${data.commentaire}</p>
              </div>
            ` : ''}
            <p>Vous pouvez modifier votre demande en fonction des remarques et la soumettre à nouveau.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Demande rejetée - ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'rejet' };
  },

  async sendRappelNotification(data: { nom: string; prenom: string; email: string; demandeRef: string; demandePoste: string; dateLimite: Date; actionUrl: string }) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Rappel de validation</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <div class="warning">
              <p><strong>RAPPEL :</strong> Une demande est en attente de votre validation !</p>
            </div>
            <ul>
              <li><strong>Référence:</strong> ${data.demandeRef}</li>
              <li><strong>Poste:</strong> ${data.demandePoste}</li>
              <li><strong>Délai limite:</strong> ${dateFormatee}</li>
            </ul>
            <p style="text-align: center;">
              <a href="${data.actionUrl}" class="button">Valider maintenant</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Rappel validation - ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'rappel' };
  },

  async sendRoleChangeNotification(data: RoleChangeEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Changement de rôle</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Votre rôle a été modifié par <strong>${data.changedBy}</strong>.</p>
            <ul>
              <li><strong>Ancien rôle:</strong> ${data.oldRole}</li>
              <li><strong>Nouveau rôle:</strong> ${data.newRole}</li>
            </ul>
            <p><strong>Important:</strong> Veuillez vous déconnecter et vous reconnecter pour que les changements prennent effet.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Changement de rôle - Kilani RH', html);
    return { success: true, to: data.email, type: 'role_change' };
  },

  async sendAccountDeactivationEmail(data: AccountDeactivationEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Désactivation de compte</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Votre compte a été désactivé.</p>
            <p><strong>Raison:</strong> ${data.reason}</p>
            ${data.reactivationDate ? `<p><strong>Réactivation prévue:</strong> ${data.reactivationDate}</p>` : ''}
            <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre administrateur.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Désactivation de compte - Kilani RH', html);
    return { success: true, to: data.email, type: 'account_deactivation' };
  },

  async sendAccountActivationEmail(data: AccountActivationEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .credentials { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Réactivation de compte</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Votre compte a été réactivé !</p>
            <div class="credentials">
              <h3>Nouveau mot de passe temporaire</h3>
              <p><strong>${data.tempPassword}</strong></p>
            </div>
            <p style="text-align: center;">
              <a href="${data.activationUrl}" class="button">Activer mon compte</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Réactivation de compte - Kilani RH', html);
    return { success: true, to: data.email, type: 'account_activation' };
  },

  async sendProfileUpdateConfirmation(data: ProfileUpdateEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .changes { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Mise à jour du profil</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Votre profil a été mis à jour avec succès.</p>
            <div class="changes">
              <strong>Champs modifiés :</strong>
              <ul>
                ${data.changes.map(change => `<li>${change}</li>`).join('')}
              </ul>
            </div>
            <p style="text-align: center;">
              <a href="${data.profileUrl}" class="button">Consulter mon profil</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Mise à jour du profil - Kilani RH', html);
    return { success: true, to: data.email, type: 'profile_update' };
  },

  async sendNotificationEmail(data: NotificationEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Notification</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>${data.message}</p>
            ${data.actionUrl ? `
              <p style="text-align: center;">
                <a href="${data.actionUrl}" class="button">Voir plus</a>
              </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, 'Notification Kilani RH', html);
    return { success: true, to: data.email, type: 'notification' };
  },

  async sendDisponibiliteRequest(data: DisponibiliteRequestData) {
    const roleLabel = data.role === 'MANAGER' ? 'Manager' : 'Directeur';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Saisie de disponibilités requise</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Une demande de recrutement a été soumise :</p>
            <ul>
              <li><strong>Référence :</strong> ${data.demandeRef}</li>
              <li><strong>Poste :</strong> ${data.poste}</li>
            </ul>
            <p>En tant que <strong>${roleLabel}</strong>, vous devez participer à l'entretien technique.</p>
            <p style="text-align: center;">
              <a href="${data.actionUrl}" class="button">Saisir mes disponibilités</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Disponibilités requises - ${data.demandeRef}`, html);
    return { success: true, to: data.email, type: 'disponibilite_request' };
  },

  async sendEntretienNotification(data: EntretienNotificationData) {
    const typeLabels: Record<string, string> = {
      RH: 'Entretien RH',
      TECHNIQUE: 'Entretien technique',
      DIRECTION: 'Entretien direction'
    };
    const dateFormatee = new Date(data.date).toLocaleDateString('fr-TN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Entretien planifié</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Un entretien a été planifié avec un candidat :</p>
            <ul>
              <li><strong>Type :</strong> ${typeLabels[data.type] || data.type}</li>
              <li><strong>Candidat :</strong> ${data.candidatNom}</li>
              <li><strong>Poste :</strong> ${data.poste}</li>
              <li><strong>Date :</strong> ${dateFormatee}</li>
              <li><strong>Heure :</strong> ${data.heure}</li>
              <li><strong>Lieu :</strong> ${data.lieu}</li>
            </ul>
            <p style="text-align: center;">
              <a href="${data.actionUrl}" class="button">Voir l'entretien</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Entretien planifié - ${data.candidatNom}`, html);
    return { success: true, to: data.email, type: 'entretien_notification' };
  },

  async sendEvaluationNotification(data: EvaluationNotificationData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouvelle évaluation période d'essai</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <div class="warning">
              <p>Une évaluation de fin de période d'essai est à réaliser :</p>
            </div>
            <ul>
              <li><strong>Référence:</strong> ${data.evaluationRef}</li>
              <li><strong>Employé:</strong> ${data.employePrenom} ${data.employeNom}</li>
              <li><strong>Jours restants:</strong> ${data.joursRestants} jours</li>
            </ul>
            <p style="text-align: center;">
              <a href="${data.actionUrl}" class="button">Réaliser l'évaluation</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Évaluation période d'essai - ${data.evaluationRef}`, html);
    return { success: true, to: data.email, type: 'evaluation' };
  },

  async sendEvaluationValidationNotification(data: EvaluationValidationNotificationData) {
    const dateFormatee = new Date(data.dateLimite).toLocaleString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
          .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Validation d'évaluation requise</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
            <p>Une évaluation de période d'essai est en attente de votre validation :</p>
            <ul>
              <li><strong>Référence:</strong> ${data.evaluationRef}</li>
              <li><strong>Employé:</strong> ${data.employePrenom} ${data.employeNom}</li>
              <li><strong>Étape:</strong> ${data.etape}/${data.totalEtapes}</li>
              <li><strong>Votre rôle:</strong> ${data.role}</li>
              <li><strong>Délai:</strong> ${dateFormatee} (48h max)</li>
            </ul>
            <p style="text-align: center;">
              <a href="${data.actionUrl}" class="button">Valider l'évaluation</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Kilani RH - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(data.email, `Validation évaluation - ${data.evaluationRef}`, html);
    return { success: true, to: data.email, type: 'evaluation_validation' };
  },

  logEmail(type: string, to: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] EMAIL [${type}] → ${to}`);
  }
};