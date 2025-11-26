const axios = require('axios');
const logger = require('./logger');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_ENABLED = process.env.SLACK_ENABLED === 'true';

/**
 * Envoyer une notification vers Slack
 * @param {Object} options - Options de la notification
 * @param {string} options.title - Titre de la notification
 * @param {string} options.message - Message principal
 * @param {string} options.level - Niveau de sévérité (info, warning, error, critical)
 * @param {Object} options.data - Données supplémentaires
 * @param {string} options.user - Utilisateur concerné
 */
async function sendSlackNotification({ title, message, level = 'info', data = {}, user = null }) {
  if (!SLACK_ENABLED || !SLACK_WEBHOOK_URL) {
    logger.debug('Slack notification skipped (disabled or not configured)', { title, level });
    return;
  }

  try {
    // Définir la couleur selon le niveau
    const colors = {
      info: '#36a64f',      // Vert
      warning: '#ff9800',   // Orange
      error: '#f44336',     // Rouge
      critical: '#9c27b0',  // Violet
    };

    // Définir l'emoji selon le niveau
    const emojis = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:',
    };

    // Construire les champs pour les données supplémentaires
    const fields = [];
    
    if (user) {
      fields.push({
        title: 'Utilisateur',
        value: user,
        short: true,
      });
    }

    // Ajouter les données supplémentaires
    Object.entries(data).forEach(([key, value]) => {
      fields.push({
        title: key,
        value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
        short: true,
      });
    });

    // Construire le payload Slack
    const payload = {
      username: 'WhatsApp Monitor',
      icon_emoji: emojis[level] || ':robot_face:',
      attachments: [
        {
          color: colors[level] || '#607d8b',
          title: `${emojis[level]} ${title}`,
          text: message,
          fields: fields.length > 0 ? fields : undefined,
          footer: 'WhatsApp Backend',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    // Envoyer la notification
    await axios.post(SLACK_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000, // 5 secondes max
    });

    logger.debug('Slack notification sent successfully', { title, level });
  } catch (error) {
    logger.error('Failed to send Slack notification', {
      error: error.message,
      title,
      level,
    });
  }
}

/**
 * Envoyer une alerte de sécurité critique
 */
async function sendSecurityAlert({ title, message, user, data = {} }) {
  return sendSlackNotification({
    title: `🔒 ALERTE SÉCURITÉ: ${title}`,
    message,
    level: 'critical',
    user,
    data,
  });
}

/**
 * Envoyer une notification d'erreur
 */
async function sendErrorAlert({ title, message, error, data = {} }) {
  const errorData = {
    ...data,
    error: error?.message || error,
    stack: error?.stack,
  };

  return sendSlackNotification({
    title: `❌ ERREUR: ${title}`,
    message,
    level: 'error',
    data: errorData,
  });
}

/**
 * Envoyer une notification d'avertissement
 */
async function sendWarningAlert({ title, message, data = {} }) {
  return sendSlackNotification({
    title: `⚠️ AVERTISSEMENT: ${title}`,
    message,
    level: 'warning',
    data,
  });
}

/**
 * Envoyer une notification informative
 */
async function sendInfoAlert({ title, message, data = {} }) {
  return sendSlackNotification({
    title,
    message,
    level: 'info',
    data,
  });
}

module.exports = {
  sendSlackNotification,
  sendSecurityAlert,
  sendErrorAlert,
  sendWarningAlert,
  sendInfoAlert,
};
