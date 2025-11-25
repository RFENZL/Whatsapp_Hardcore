const winston = require('winston');
const path = require('path');

// Définir les niveaux de logs
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Définir les couleurs pour chaque niveau
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Format pour les logs en développement (lisible)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Format pour les logs en production (JSON structuré)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Déterminer le niveau de log selon l'environnement
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Configuration des transports
const transports = [];
const DailyRotateFile = require('winston-daily-rotate-file');

// Console transport (toujours actif)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  })
);

// File transport pour les erreurs (rotation quotidienne) - toujours actif
transports.push(
  new DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: prodFormat,
  })
);

// File transport pour tous les logs (rotation quotidienne) - toujours actif
transports.push(
  new DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: prodFormat,
  })
);

// Créer le logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Stream pour Morgan (logs HTTP)
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

// === MÉTHODES SPÉCIALISÉES POUR LES LOGS ===

/**
 * Log des connexions utilisateur
 * @param {Object} data - Données de connexion
 */
logger.logLogin = function(data) {
  this.info('USER_LOGIN', {
    category: 'auth',
    ...data,
  });
};

/**
 * Log des déconnexions
 * @param {Object} data - Données de déconnexion
 */
logger.logLogout = function(data) {
  this.info('USER_LOGOUT', {
    category: 'auth',
    ...data,
  });
};

/**
 * Log des actions utilisateur importantes
 * @param {string} action - Type d'action
 * @param {Object} data - Données de l'action
 */
logger.logUserAction = function(action, data) {
  this.info(`USER_ACTION: ${action}`, {
    category: 'user_action',
    action,
    ...data,
  });
};

/**
 * Log des erreurs avec contexte enrichi
 * @param {string} message - Message d'erreur
 * @param {Error} error - Objet Error
 * @param {Object} context - Contexte supplémentaire
 */
logger.logError = function(message, error, context = {}) {
  this.error(message, {
    category: 'error',
    error: error?.message || error,
    stack: error?.stack,
    ...context,
  });
  
  // Envoyer une alerte Slack pour les erreurs critiques
  if (context.critical) {
    this.sendCriticalAlert(message, error, context);
  }
};

/**
 * Log des événements WebSocket
 * @param {string} event - Type d'événement
 * @param {Object} data - Données de l'événement
 */
logger.logWebSocket = function(event, data) {
  this.debug(`WEBSOCKET: ${event}`, {
    category: 'websocket',
    event,
    ...data,
  });
};

/**
 * Log des connexions WebSocket
 * @param {Object} data - Données de connexion
 */
logger.logWebSocketConnection = function(data) {
  this.info('WEBSOCKET_CONNECTION', {
    category: 'websocket',
    ...data,
  });
};

/**
 * Log des déconnexions WebSocket
 * @param {Object} data - Données de déconnexion
 */
logger.logWebSocketDisconnection = function(data) {
  this.info('WEBSOCKET_DISCONNECTION', {
    category: 'websocket',
    ...data,
  });
};

/**
 * Log des messages WebSocket
 * @param {string} event - Type de message
 * @param {Object} data - Données du message
 */
logger.logWebSocketMessage = function(event, data) {
  this.debug(`WEBSOCKET_MESSAGE: ${event}`, {
    category: 'websocket',
    event,
    ...data,
  });
};

/**
 * Log des requêtes API importantes
 * @param {Object} data - Données de la requête
 */
logger.logApiRequest = function(data) {
  this.http('API_REQUEST', {
    category: 'api',
    ...data,
  });
};

/**
 * Log des modifications de données sensibles
 * @param {string} entity - Type d'entité modifiée
 * @param {Object} data - Données de la modification
 */
logger.logDataModification = function(entity, data) {
  this.warn(`DATA_MODIFICATION: ${entity}`, {
    category: 'data_modification',
    entity,
    ...data,
  });
};

/**
 * Log des tentatives d'accès non autorisées
 * @param {Object} data - Données de la tentative
 */
logger.logUnauthorizedAccess = function(data) {
  this.warn('UNAUTHORIZED_ACCESS', {
    category: 'security',
    ...data,
  });
  
  // Envoyer une alerte pour les tentatives suspectes
  this.sendCriticalAlert('Tentative d\'accès non autorisé', null, data);
};

/**
 * Envoyer une alerte critique
 * @param {string} message - Message de l'alerte
 * @param {Error} error - Erreur éventuelle
 * @param {Object} context - Contexte
 */
logger.sendCriticalAlert = async function(message, error, context = {}) {
  // Logger l'alerte critique
  this.error(`CRITICAL ALERT: ${message}`, {
    error: error?.message || error,
    stack: error?.stack,
    ...context,
  });
};

/**
 * Log des performances (temps d'exécution)
 * @param {string} operation - Opération mesurée
 * @param {number} duration - Durée en ms
 * @param {Object} data - Données supplémentaires
 */
logger.logPerformance = function(operation, duration, data = {}) {
  const level = duration > 1000 ? 'warn' : 'info';
  this[level](`PERFORMANCE: ${operation}`, {
    category: 'performance',
    operation,
    duration,
    ...data,
  });
  
  // Alerte si l'opération est trop lente
  if (duration > 5000) {
    this.warn(`Slow operation detected: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...data,
    });
  }
};

module.exports = logger;
