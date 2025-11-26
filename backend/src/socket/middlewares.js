const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const Sentry = require('@sentry/node');

// Middleware d'authentification pour les namespaces Socket.IO
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      logger.logWebSocket('auth_failed', {
        socketId: socket.id,
        reason: 'no_token',
        ip: socket.handshake.address,
      });
      return next(new Error('Unauthorized'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await User.findById(decoded.id);
    if (!user) {
      logger.logWebSocket('auth_failed', {
        socketId: socket.id,
        reason: 'user_not_found',
        userId: decoded.id,
      });
      return next(new Error('Unauthorized'));
    }
    
    socket.user = user;
    
    // Log de connexion réussie
    logger.logWebSocketConnection({
      socketId: socket.id,
      userId: user._id,
      username: user.username,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
    });
    
    // Breadcrumb Sentry
    Sentry.addBreadcrumb({
      category: 'websocket',
      message: 'WebSocket connection authenticated',
      level: 'info',
      data: {
        socketId: socket.id,
        userId: user._id.toString(),
        username: user.username,
      },
    });
    
    next();
  } catch (e) {
    logger.warn('Socket auth failed', { 
      error: e.message,
      socketId: socket.id,
      ip: socket.handshake.address,
    });
    next(new Error('Unauthorized'));
  }
}

// Middleware de rate limiting pour Socket.IO
function createRateLimiter(options = {}) {
  const {
    windowMs = 60000,           // 1 minute par défaut
    maxRequests = 100,          // 100 requêtes max
    keyGenerator = (socket) => socket.user?._id.toString() || socket.id,
    handler = (socket, event) => {
      logger.warn('Rate limit exceeded', {
        socketId: socket.id,
        userId: socket.user?._id.toString(),
        event,
        ip: socket.handshake.address,
      });
      
      // Breadcrumb Sentry pour les rate limits
      Sentry.addBreadcrumb({
        category: 'websocket',
        message: 'WebSocket rate limit exceeded',
        level: 'warning',
        data: {
          socketId: socket.id,
          userId: socket.user?._id.toString(),
          event,
        },
      });
      
      socket.emit('rate-limit-exceeded', { 
        event, 
        message: 'Too many requests, please slow down' 
      });
    }
  } = options;

  const requests = new Map();

  return function checkRateLimit(socket, event) {
    const key = `${keyGenerator(socket)}:${event}`;
    const now = Date.now();
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    
    // Nettoyer les anciennes requêtes
    const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    requests.set(key, recentRequests);

    if (recentRequests.length >= maxRequests) {
      handler(socket, event);
      return false; // Rate limit dépassé
    }

    // Ajouter la requête actuelle
    recentRequests.push(now);
    return true; // OK
  };
}

// Système de heartbeat avec métriques
class HeartbeatManager {
  constructor() {
    this.heartbeats = new Map();
    this.metrics = new Map();
  }

  // Enregistrer un heartbeat
  recordHeartbeat(socketId, userId, latency = 0) {
    const now = Date.now();
    
    this.heartbeats.set(socketId, {
      userId,
      timestamp: now,
      latency
    });

    // Enregistrer les métriques
    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, {
        totalHeartbeats: 0,
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        lastSeen: now
      });
    }

    const userMetrics = this.metrics.get(userId);
    userMetrics.totalHeartbeats++;
    userMetrics.avgLatency = 
      (userMetrics.avgLatency * (userMetrics.totalHeartbeats - 1) + latency) / 
      userMetrics.totalHeartbeats;
    userMetrics.minLatency = Math.min(userMetrics.minLatency, latency);
    userMetrics.maxLatency = Math.max(userMetrics.maxLatency, latency);
    userMetrics.lastSeen = now;
  }

  // Retirer un heartbeat
  removeHeartbeat(socketId) {
    this.heartbeats.delete(socketId);
  }

  // Obtenir les métriques d'un utilisateur
  getMetrics(userId) {
    return this.metrics.get(userId) || null;
  }

  // Obtenir tous les utilisateurs actifs
  getActiveUsers() {
    const now = Date.now();
    const activeThreshold = 60000; // 1 minute
    const activeUsers = new Set();

    for (const [socketId, data] of this.heartbeats.entries()) {
      if (now - data.timestamp < activeThreshold) {
        activeUsers.add(data.userId);
      }
    }

    return Array.from(activeUsers);
  }

  // Nettoyer les heartbeats inactifs
  cleanup(inactiveThreshold = 120000) { // 2 minutes
    const now = Date.now();
    
    for (const [socketId, data] of this.heartbeats.entries()) {
      if (now - data.timestamp > inactiveThreshold) {
        this.heartbeats.delete(socketId);
      }
    }
  }

  // Obtenir des statistiques globales
  getGlobalStats() {
    const users = Array.from(this.metrics.values());
    
    if (users.length === 0) {
      return {
        totalUsers: 0,
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0
      };
    }

    return {
      totalUsers: users.length,
      avgLatency: users.reduce((sum, u) => sum + u.avgLatency, 0) / users.length,
      minLatency: Math.min(...users.map(u => u.minLatency)),
      maxLatency: Math.max(...users.map(u => u.maxLatency)),
      activeUsers: this.getActiveUsers().length
    };
  }
}

// Gestion des conflits d'édition
class ConflictManager {
  constructor() {
    this.locks = new Map(); // messageId -> { userId, socketId, timestamp }
  }

  // Verrouiller un message pour édition
  lock(messageId, userId, socketId) {
    const now = Date.now();
    
    if (this.locks.has(messageId)) {
      const existingLock = this.locks.get(messageId);
      
      // Vérifier si le lock est expiré (5 minutes)
      if (now - existingLock.timestamp < 300000) {
        return {
          success: false,
          lockedBy: existingLock.userId,
          message: 'Message is being edited by another user'
        };
      }
    }

    this.locks.set(messageId, {
      userId,
      socketId,
      timestamp: now
    });

    return { success: true };
  }

  // Déverrouiller un message
  unlock(messageId, userId) {
    const lock = this.locks.get(messageId);
    
    if (!lock) {
      return { success: false, message: 'No lock found' };
    }

    if (lock.userId !== userId) {
      return { success: false, message: 'Not authorized to unlock' };
    }

    this.locks.delete(messageId);
    return { success: true };
  }

  // Vérifier si un message est verrouillé
  isLocked(messageId, userId = null) {
    const lock = this.locks.get(messageId);
    
    if (!lock) return false;
    
    // Si userId fourni, vérifier si c'est le même utilisateur
    if (userId && lock.userId === userId) return false;
    
    // Vérifier si le lock n'est pas expiré
    const now = Date.now();
    if (now - lock.timestamp >= 300000) {
      this.locks.delete(messageId);
      return false;
    }

    return true;
  }

  // Obtenir le propriétaire du lock
  getLockOwner(messageId) {
    const lock = this.locks.get(messageId);
    return lock ? lock.userId : null;
  }

  // Nettoyer les locks expirés
  cleanup() {
    const now = Date.now();
    const expiredThreshold = 300000; // 5 minutes

    for (const [messageId, lock] of this.locks.entries()) {
      if (now - lock.timestamp >= expiredThreshold) {
        this.locks.delete(messageId);
      }
    }
  }

  // Retirer tous les locks d'un socket
  releaseSocketLocks(socketId) {
    for (const [messageId, lock] of this.locks.entries()) {
      if (lock.socketId === socketId) {
        this.locks.delete(messageId);
      }
    }
  }
}

// Middleware de logging pour tous les événements WebSocket
function createEventLogger(options = {}) {
  const {
    logAllEvents = false,
    eventsToLog = ['message:send', 'message:edit', 'message:delete', 'typing', 'status:change'],
    excludeEvents = ['heartbeat', 'ping', 'pong'],
  } = options;

  return function logEvent(socket, eventName, data = {}) {
    // Vérifier si l'événement doit être loggé
    if (excludeEvents.includes(eventName)) {
      return;
    }

    if (!logAllEvents && !eventsToLog.includes(eventName)) {
      return;
    }

    const logData = {
      socketId: socket.id,
      userId: socket.user?._id?.toString(),
      username: socket.user?.username,
      event: eventName,
      ip: socket.handshake.address,
      timestamp: new Date().toISOString(),
    };

    // Ne pas logger les données sensibles complètes
    if (data && Object.keys(data).length > 0) {
      logData.dataKeys = Object.keys(data);
      
      // Logger certaines propriétés non sensibles
      if (data.conversationId) logData.conversationId = data.conversationId;
      if (data.messageId) logData.messageId = data.messageId;
      if (data.groupId) logData.groupId = data.groupId;
    }

    logger.logWebSocketMessage(eventName, logData);

    // Breadcrumb Sentry pour les événements importants
    const importantEvents = ['message:send', 'message:edit', 'message:delete', 'status:change'];
    if (importantEvents.includes(eventName)) {
      Sentry.addBreadcrumb({
        category: 'websocket',
        message: `WebSocket event: ${eventName}`,
        level: 'info',
        data: logData,
      });
    }
  };
}

// Wrapper pour enregistrer les erreurs WebSocket
function handleSocketError(socket, error, context = {}) {
  const errorData = {
    socketId: socket.id,
    userId: socket.user?._id?.toString(),
    username: socket.user?.username,
    error: error.message,
    stack: error.stack,
    ip: socket.handshake.address,
    ...context,
  };

  logger.logError('WebSocket error', error, errorData);

  // Capturer l'erreur dans Sentry
  Sentry.captureException(error, {
    tags: {
      type: 'websocket',
      socketId: socket.id,
    },
    user: socket.user ? {
      id: socket.user._id.toString(),
      username: socket.user.username,
    } : undefined,
    contexts: {
      websocket: errorData,
    },
  });
}

// Middleware pour tracker la déconnexion
function trackDisconnection(socket, reason) {
  logger.logWebSocketDisconnection({
    socketId: socket.id,
    userId: socket.user?._id?.toString(),
    username: socket.user?.username,
    reason,
    ip: socket.handshake.address,
  });

  // Breadcrumb Sentry
  Sentry.addBreadcrumb({
    category: 'websocket',
    message: 'WebSocket disconnection',
    level: 'info',
    data: {
      socketId: socket.id,
      userId: socket.user?._id?.toString(),
      reason,
    },
  });
}

module.exports = {
  authenticateSocket,
  createRateLimiter,
  HeartbeatManager,
  ConflictManager,
  createEventLogger,
  handleSocketError,
  trackDisconnection,
};
