const logger = require('./logger');
const { sendSecurityAlert, sendWarningAlert } = require('./slackNotifier');
const Sentry = require('@sentry/node');

/**
 * Alerte pour une nouvelle connexion
 * @param {Object} params
 * @param {Object} params.user - L'utilisateur qui se connecte
 * @param {Object} params.session - La session créée
 * @param {boolean} params.isNewLocation - Si c'est une nouvelle localisation
 */
async function alertNewLogin({ user, session, isNewLocation = false }) {
  try {
    const data = {
      'Email': user.email,
      'IP Address': session.ipAddress,
      'User Agent': session.userAgent,
      'Location': session.location ? `${session.location.city}, ${session.location.country}` : 'Unknown',
      'Timestamp': new Date().toISOString(),
    };

    // Log dans les fichiers
    logger.info('User login', {
      userId: user._id,
      username: user.username,
      email: user.email,
      ipAddress: session.ipAddress,
      location: session.location,
      isNewLocation,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'User logged in',
      level: 'info',
      data: {
        userId: user._id.toString(),
        username: user.username,
        isNewLocation,
      },
    });

    // Si c'est une nouvelle localisation, envoyer une alerte de sécurité
    if (isNewLocation) {
      await sendSecurityAlert({
        title: 'Nouvelle connexion depuis un emplacement inhabituel',
        message: `L'utilisateur ${user.username} (${user.email}) s'est connecté depuis une nouvelle localisation.`,
        user: `${user.username} (${user.email})`,
        data,
      });

      logger.warn('New location login detected', {
        userId: user._id,
        username: user.username,
        location: session.location,
      });
    }
  } catch (error) {
    logger.error('Failed to send login alert', { error: error.message });
  }
}

/**
 * Alerte pour une modification de profil
 * @param {Object} params
 * @param {Object} params.user - L'utilisateur
 * @param {Object} params.changes - Les champs modifiés
 * @param {string} params.ipAddress - L'adresse IP
 */
async function alertProfileModification({ user, changes, ipAddress }) {
  try {
    const changedFields = Object.keys(changes).join(', ');

    logger.info('Profile modified', {
      userId: user._id,
      username: user.username,
      email: user.email,
      changes,
      ipAddress,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'user',
      message: 'User profile modified',
      level: 'info',
      data: {
        userId: user._id.toString(),
        username: user.username,
        changedFields,
      },
    });

    // Alerte Slack pour les modifications importantes
    const sensitiveFields = ['email', 'password', 'username'];
    const isSensitive = Object.keys(changes).some(field => sensitiveFields.includes(field));

    if (isSensitive) {
      await sendSecurityAlert({
        title: 'Modification de profil sensible',
        message: `L'utilisateur ${user.username} a modifié son profil (champs: ${changedFields})`,
        user: `${user.username} (${user.email})`,
        data: {
          'Champs modifiés': changedFields,
          'IP Address': ipAddress,
          'Timestamp': new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    logger.error('Failed to send profile modification alert', { error: error.message });
  }
}

/**
 * Alerte pour une modification de paramètres de sécurité
 * @param {Object} params
 * @param {Object} params.user - L'utilisateur
 * @param {string} params.action - L'action effectuée
 * @param {Object} params.details - Détails de l'action
 * @param {string} params.ipAddress - L'adresse IP
 */
async function alertSecuritySettingsChange({ user, action, details, ipAddress }) {
  try {
    logger.warn('Security settings changed', {
      userId: user._id,
      username: user.username,
      action,
      details,
      ipAddress,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'security',
      message: `Security settings changed: ${action}`,
      level: 'warning',
      data: {
        userId: user._id.toString(),
        username: user.username,
        action,
      },
    });

    await sendSecurityAlert({
      title: 'Modification des paramètres de sécurité',
      message: `L'utilisateur ${user.username} a effectué l'action: ${action}`,
      user: `${user.username} (${user.email})`,
      data: {
        'Action': action,
        'Détails': JSON.stringify(details),
        'IP Address': ipAddress,
        'Timestamp': new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to send security settings change alert', { error: error.message });
  }
}

/**
 * Alerte pour l'ajout d'un nouveau contact
 * @param {Object} params
 * @param {Object} params.user - L'utilisateur qui ajoute le contact
 * @param {Object} params.contact - Le contact ajouté
 * @param {string} params.ipAddress - L'adresse IP
 */
async function alertContactAdded({ user, contact, ipAddress }) {
  try {
    logger.info('Contact added', {
      userId: user._id,
      username: user.username,
      contactId: contact._id,
      contactUsername: contact.username,
      ipAddress,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'contact',
      message: 'Contact added',
      level: 'info',
      data: {
        userId: user._id.toString(),
        contactId: contact._id.toString(),
      },
    });

    // Pas d'alerte Slack pour cette action (trop fréquente)
    // Seulement des logs pour audit
  } catch (error) {
    logger.error('Failed to send contact added alert', { error: error.message });
  }
}

/**
 * Alerte pour le blocage d'un contact
 * @param {Object} params
 * @param {Object} params.user - L'utilisateur qui bloque
 * @param {Object} params.blockedUser - L'utilisateur bloqué
 * @param {string} params.ipAddress - L'adresse IP
 */
async function alertContactBlocked({ user, blockedUser, ipAddress }) {
  try {
    logger.warn('Contact blocked', {
      userId: user._id,
      username: user.username,
      blockedUserId: blockedUser._id,
      blockedUsername: blockedUser.username,
      ipAddress,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'contact',
      message: 'Contact blocked',
      level: 'warning',
      data: {
        userId: user._id.toString(),
        blockedUserId: blockedUser._id.toString(),
      },
    });

    // Alerte Slack pour les blocages (peut indiquer du harcèlement)
    await sendWarningAlert({
      title: 'Contact bloqué',
      message: `L'utilisateur ${user.username} a bloqué ${blockedUser.username}`,
      data: {
        'Utilisateur': `${user.username} (${user.email})`,
        'Contact bloqué': `${blockedUser.username}`,
        'IP Address': ipAddress,
        'Timestamp': new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to send contact blocked alert', { error: error.message });
  }
}

/**
 * Alerte pour le déblocage d'un contact
 * @param {Object} params
 * @param {Object} params.user - L'utilisateur qui débloque
 * @param {Object} params.unblockedUser - L'utilisateur débloqué
 * @param {string} params.ipAddress - L'adresse IP
 */
async function alertContactUnblocked({ user, unblockedUser, ipAddress }) {
  try {
    logger.info('Contact unblocked', {
      userId: user._id,
      username: user.username,
      unblockedUserId: unblockedUser._id,
      unblockedUsername: unblockedUser.username,
      ipAddress,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'contact',
      message: 'Contact unblocked',
      level: 'info',
      data: {
        userId: user._id.toString(),
        unblockedUserId: unblockedUser._id.toString(),
      },
    });
  } catch (error) {
    logger.error('Failed to send contact unblocked alert', { error: error.message });
  }
}

/**
 * Alerte pour une suppression de compte
 * @param {Object} params
 * @param {Object} params.user - L'utilisateur
 * @param {string} params.ipAddress - L'adresse IP
 */
async function alertAccountDeletion({ user, ipAddress }) {
  try {
    logger.warn('Account deleted', {
      userId: user._id,
      username: user.username,
      email: user.email,
      ipAddress,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'user',
      message: 'Account deleted',
      level: 'warning',
      data: {
        userId: user._id.toString(),
        username: user.username,
      },
    });

    await sendSecurityAlert({
      title: 'Suppression de compte',
      message: `L'utilisateur ${user.username} a supprimé son compte`,
      user: `${user.username} (${user.email})`,
      data: {
        'IP Address': ipAddress,
        'Timestamp': new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to send account deletion alert', { error: error.message });
  }
}

/**
 * Alerte pour des tentatives de connexion échouées répétées
 * @param {Object} params
 * @param {string} params.email - L'email utilisé
 * @param {string} params.ipAddress - L'adresse IP
 * @param {number} params.attempts - Nombre de tentatives
 */
async function alertFailedLoginAttempts({ email, ipAddress, attempts }) {
  try {
    logger.warn('Multiple failed login attempts', {
      email,
      ipAddress,
      attempts,
    });

    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'security',
      message: 'Multiple failed login attempts',
      level: 'warning',
      data: {
        email,
        ipAddress,
        attempts,
      },
    });

    if (attempts >= 5) {
      await sendSecurityAlert({
        title: 'Tentatives de connexion échouées suspectes',
        message: `${attempts} tentatives de connexion échouées pour l'email ${email}`,
        user: email,
        data: {
          'IP Address': ipAddress,
          'Tentatives': attempts,
          'Timestamp': new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    logger.error('Failed to send failed login attempts alert', { error: error.message });
  }
}

module.exports = {
  alertNewLogin,
  alertProfileModification,
  alertSecuritySettingsChange,
  alertContactAdded,
  alertContactBlocked,
  alertContactUnblocked,
  alertAccountDeletion,
  alertFailedLoginAttempts,
};
