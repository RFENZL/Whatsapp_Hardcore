const nodemailer = require('nodemailer');
const logger = require('./logger');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true pour 465, false pour d'autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Vérifier la configuration au démarrage (en développement uniquement)
if (process.env.NODE_ENV === 'development' && process.env.SMTP_USER) {
  transporter.verify((error) => {
    if (error) {
      logger.error('SMTP configuration error', { error: error.message });
    } else {
      logger.info('SMTP server is ready to send emails');
    }
  });
}

/**
 * Envoyer un email de vérification
 */
async function sendVerificationEmail(user, token) {
  const verificationUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'Vérifiez votre adresse email',
    html: `
      <h1>Bienvenue ${user.username} !</h1>
      <p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>Ce lien expirera dans 24 heures.</p>
      <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
    `,
  };
  
  try {
    if (!process.env.SMTP_USER) {
      logger.warn('Email verification skipped - SMTP not configured', { userId: user._id });
      return;
    }
    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent', { userId: user._id, email: user.email });
  } catch (error) {
    logger.error('Failed to send verification email', { 
      userId: user._id, 
      email: user.email,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Bonjour ${user.username},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    `,
  };
  
  try {
    if (!process.env.SMTP_USER) {
      logger.warn('Password reset email skipped - SMTP not configured', { userId: user._id });
      return;
    }
    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent', { userId: user._id, email: user.email });
  } catch (error) {
    logger.error('Failed to send password reset email', { 
      userId: user._id, 
      email: user.email,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Envoyer une notification de nouvelle session
 */
async function sendNewSessionNotification(user, session) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'Nouvelle connexion détectée',
    html: `
      <h1>Nouvelle connexion à votre compte</h1>
      <p>Bonjour ${user.username},</p>
      <p>Une nouvelle connexion a été détectée sur votre compte.</p>
      <h3>Détails de la connexion :</h3>
      <ul>
        <li><strong>Date :</strong> ${new Date(session.loginTime).toLocaleString('fr-FR')}</li>
        <li><strong>Localisation :</strong> ${session.location?.city || 'Inconnue'}, ${session.location?.country || ''}</li>
        <li><strong>IP :</strong> ${session.ipAddress}</li>
        <li><strong>Appareil :</strong> ${session.userAgent}</li>
      </ul>
      <p>Si ce n'était pas vous, <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings">changez votre mot de passe immédiatement</a> et déconnectez tous les appareils.</p>
    `,
  };
  
  try {
    if (!process.env.SMTP_USER) {
      logger.warn('New session notification skipped - SMTP not configured', { userId: user._id });
      return;
    }
    await transporter.sendMail(mailOptions);
    logger.info('New session notification sent', { userId: user._id, sessionId: session._id });
  } catch (error) {
    logger.error('Failed to send new session notification', { 
      userId: user._id, 
      sessionId: session._id,
      error: error.message 
    });
    // Ne pas throw, c'est juste une notification
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNewSessionNotification
};
