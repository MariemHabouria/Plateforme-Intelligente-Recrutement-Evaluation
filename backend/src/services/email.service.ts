import nodemailer from 'nodemailer';

// ===========================================
// TYPES
// ===========================================

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

interface InvitationEmailData {
  nom: string;
  prenom: string;
  email: string;
  tempPassword: string;
  role: string;
  loginUrl: string;
}

// ===========================================
// SMTP TRANSPORTER CONFIGURATION
// ===========================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error.message);
  } else {
    console.log('✅ SMTP Server ready to send emails');
  }
});

// ===========================================
// EMAIL TEMPLATES
// ===========================================

const templates = {
  /**
   * Welcome email with temporary password
   */
  welcome: (data: WelcomeEmailData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Kilani RH</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: #9A8A50; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Kilani RH</h1>
      <p style="color: #EDE5CA; margin: 8px 0 0 0;">Intelligent Recruitment Platform</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <h2 style="color: #1E1A0E; margin-top: 0;">Bonjour ${data.prenom} ${data.nom},</h2>
      
      <p style="color: #4B5563; line-height: 1.6;">Votre compte a été créé sur la plateforme Kilani RH avec le rôle : <strong style="color: #9A8A50;">${data.role}</strong>.</p>
      
      <!-- Credentials Box -->
      <div style="background-color: #F7F3E8; border-left: 4px solid #9A8A50; padding: 20px; margin: 25px 0; border-radius: 8px;">
        <h3 style="color: #1E1A0E; margin: 0 0 12px 0;">🔐 Vos identifiants temporaires</h3>
        <p style="margin: 8px 0;"><strong style="color: #1E1A0E;">Email:</strong> ${data.email}</p>
        <p style="margin: 8px 0;"><strong style="color: #1E1A0E;">Mot de passe temporaire:</strong> <code style="background: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${data.tempPassword}</code></p>
      </div>
      
      <!-- Login Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.loginUrl}" style="background-color: #9A8A50; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Se connecter</a>
      </div>
      
      <!-- Important Note -->
      <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
        <p style="color: #92400E; font-size: 13px; margin: 0;">
          <strong>⚠️ Important :</strong> Ce mot de passe est temporaire. Vous devrez le changer lors de votre première connexion.
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #EDE5CA; margin: 20px 0;">
      
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
        Cet email est automatique, merci de ne pas y répondre.<br>
        © 2026 Kilani Groupe - Tous droits réservés.
      </p>
    </div>
  </div>
</body>
</html>
  `,

  /**
   * Reset password email
   */
  resetPassword: (data: ResetPasswordEmailData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation mot de passe</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="background-color: #9A8A50; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">Kilani RH</h1>
      <p style="color: #EDE5CA; margin: 8px 0 0 0;">Sécurité du compte</p>
    </div>
    
    <div style="padding: 30px;">
      <h2 style="color: #1E1A0E; margin-top: 0;">Bonjour ${data.prenom} ${data.nom},</h2>
      
      <p style="color: #4B5563; line-height: 1.6;">Votre mot de passe a été réinitialisé par l'administrateur.</p>
      
      <div style="background-color: #F7F3E8; border-left: 4px solid #9A8A50; padding: 20px; margin: 25px 0; border-radius: 8px;">
        <h3 style="color: #1E1A0E; margin: 0 0 12px 0;">🔐 Nouveau mot de passe temporaire</h3>
        <p style="margin: 8px 0;"><strong style="color: #1E1A0E;">Email:</strong> ${data.email}</p>
        <p style="margin: 8px 0;"><strong style="color: #1E1A0E;">Mot de passe temporaire:</strong> <code style="background: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${data.tempPassword}</code></p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.loginUrl}" style="background-color: #9A8A50; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Se connecter</a>
      </div>
      
      <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
        <p style="color: #92400E; font-size: 13px; margin: 0;">
          <strong>⚠️ Important :</strong> Vous devrez changer ce mot de passe à votre prochaine connexion.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `,

  /**
   * Profile update confirmation email
   */
  profileUpdate: (data: ProfileUpdateEmailData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Confirmation mise à jour</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #9A8A50; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">Kilani RH</h1>
    </div>
    
    <div style="padding: 30px;">
      <h2 style="color: #1E1A0E;">Bonjour ${data.prenom} ${data.nom},</h2>
      <p>Votre profil a été mis à jour avec succès.</p>
      
      <div style="background: #F7F3E8; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p><strong>Modifications effectuées :</strong></p>
        <ul>
          ${data.changes.map(change => `<li>${change}</li>`).join('')}
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.profileUrl}" style="background: #9A8A50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Voir mon profil</a>
      </div>
      
      <p style="color: #666; font-size: 12px;">Si vous n'êtes pas à l'origine de ces modifications, contactez immédiatement l'administrateur.</p>
    </div>
  </div>
</body>
</html>
  `,

  /**
   * Role change notification email
   */
  roleChange: (data: RoleChangeEmailData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Changement de rôle</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #9A8A50; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">Kilani RH</h1>
    </div>
    
    <div style="padding: 30px;">
      <h2 style="color: #1E1A0E;">Bonjour ${data.prenom} ${data.nom},</h2>
      <p>Votre rôle sur la plateforme a été modifié.</p>
      
      <div style="background: #F7F3E8; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p><strong>Ancien rôle :</strong> ${data.oldRole}</p>
        <p><strong>Nouveau rôle :</strong> ${data.newRole}</p>
        <p><strong>Modifié par :</strong> ${data.changedBy}</p>
      </div>
      
      <p>Vos accès ont été mis à jour en conséquence.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/login" style="background: #9A8A50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Accéder à la plateforme</a>
      </div>
    </div>
  </div>
</body>
</html>
  `,

  /**
   * Account deactivation email
   */
  accountDeactivation: (data: AccountDeactivationEmailData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compte désactivé</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #9A8A50; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">Kilani RH</h1>
    </div>
    
    <div style="padding: 30px;">
      <h2 style="color: #1E1A0E;">Bonjour ${data.prenom} ${data.nom},</h2>
      <p>Votre compte a été désactivé.</p>
      
      <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p><strong>Raison :</strong> ${data.reason}</p>
        ${data.reactivationDate ? `<p><strong>Réactivation prévue :</strong> ${data.reactivationDate}</p>` : ''}
      </div>
      
      <p>Pour toute question, contactez l'administrateur.</p>
    </div>
  </div>
</body>
</html>
  `,

  /**
   * Account activation email (with activation link)
   */
  accountActivation: (data: AccountActivationEmailData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Activez votre compte</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #9A8A50; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">Kilani RH</h1>
    </div>
    
    <div style="padding: 30px;">
      <h2 style="color: #1E1A0E;">Bienvenue ${data.prenom} ${data.nom} !</h2>
      <p>Votre compte a été créé sur la plateforme Kilani RH.</p>
      
      <div style="background: #F7F3E8; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p><strong>Email :</strong> ${data.email}</p>
        <p><strong>Mot de passe temporaire :</strong> <code>${data.tempPassword}</code></p>
      </div>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${data.activationUrl}" style="background: #9A8A50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Activer mon compte</a>
      </div>
      
      <p style="color: #666; font-size: 12px;">⚠️ Ce lien expire dans 24 heures.</p>
    </div>
  </div>
</body>
</html>
  `,

  /**
   * Invitation email (resend welcome)
   */
  invitation: (data: InvitationEmailData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invitation Kilani RH</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #9A8A50; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">Kilani RH</h1>
    </div>
    
    <div style="padding: 30px;">
      <h2 style="color: #1E1A0E;">Bonjour ${data.prenom} ${data.nom},</h2>
      <p>Vous avez été invité à rejoindre la plateforme Kilani RH.</p>
      
      <div style="background: #F7F3E8; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p><strong>Rôle :</strong> ${data.role}</p>
        <p><strong>Email :</strong> ${data.email}</p>
        <p><strong>Mot de passe temporaire :</strong> <code>${data.tempPassword}</code></p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.loginUrl}" style="background: #9A8A50; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px;">Se connecter</a>
      </div>
    </div>
  </div>
</body>
</html>
  `,
};

// ===========================================
// EMAIL SERVICE EXPORTS
// ===========================================

export const emailService = {
  /**
   * Send welcome email with temporary password
   */
  async sendWelcomeEmail(data: WelcomeEmailData) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kilani RH" <noreply@kilani.tn>',
        to: data.email,
        subject: 'Bienvenue sur Kilani RH - Vos identifiants de connexion',
        html: templates.welcome(data),
      });
      console.log(`✅ Welcome email sent to ${data.email} - ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      console.log(`[FALLBACK] Email for ${data.email} would contain password: ${data.tempPassword}`);
      return { success: false, error };
    }
  },

  /**
   * Send reset password email
   */
  async sendResetPasswordEmail(data: ResetPasswordEmailData) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kilani RH" <noreply@kilani.tn>',
        to: data.email,
        subject: 'Réinitialisation de votre mot de passe Kilani RH',
        html: templates.resetPassword(data),
      });
      console.log(`✅ Reset email sent to ${data.email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send reset email:', error);
      console.log(`[FALLBACK] New password for ${data.email}: ${data.tempPassword}`);
      return { success: false, error };
    }
  },

  /**
   * Send profile update confirmation email
   */
  async sendProfileUpdateConfirmation(data: ProfileUpdateEmailData) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kilani RH" <noreply@kilani.tn>',
        to: data.email,
        subject: 'Confirmation - Mise à jour de votre profil',
        html: templates.profileUpdate(data),
      });
      console.log(`✅ Profile update confirmation sent to ${data.email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send profile update email:', error);
      return { success: false, error };
    }
  },

  /**
   * Send role change notification email
   */
  async sendRoleChangeNotification(data: RoleChangeEmailData) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kilani RH" <noreply@kilani.tn>',
        to: data.email,
        subject: 'Changement de rôle - Kilani RH',
        html: templates.roleChange(data),
      });
      console.log(`✅ Role change notification sent to ${data.email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send role change email:', error);
      return { success: false, error };
    }
  },

  /**
   * Send account deactivation email
   */
  async sendAccountDeactivationEmail(data: AccountDeactivationEmailData) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kilani RH" <noreply@kilani.tn>',
        to: data.email,
        subject: 'Désactivation de votre compte - Kilani RH',
        html: templates.accountDeactivation(data),
      });
      console.log(`✅ Account deactivation email sent to ${data.email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send deactivation email:', error);
      return { success: false, error };
    }
  },

  /**
   * Send account activation email (with activation link)
   */
  async sendAccountActivationEmail(data: AccountActivationEmailData) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kilani RH" <noreply@kilani.tn>',
        to: data.email,
        subject: 'Activez votre compte - Kilani RH',
        html: templates.accountActivation(data),
      });
      console.log(`✅ Activation email sent to ${data.email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send activation email:', error);
      return { success: false, error };
    }
  },

  /**
   * Send invitation email (resend welcome)
   */
  async sendInvitationEmail(data: InvitationEmailData) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kilani RH" <noreply@kilani.tn>',
        to: data.email,
        subject: 'Invitation à rejoindre Kilani RH',
        html: templates.invitation(data),
      });
      console.log(`✅ Invitation email sent to ${data.email}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send invitation email:', error);
      console.log(`[FALLBACK] Invitation for ${data.email} would contain password: ${data.tempPassword}`);
      return { success: false, error };
    }
  },
};