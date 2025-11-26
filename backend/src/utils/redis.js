const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;
let redisPubClient = null;
let redisSubClient = null;

// Créer un client Redis avec gestion des erreurs
async function createRedisClient(options = {}) {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection limit reached');
          return new Error('Redis reconnection failed');
        }
        return Math.min(retries * 100, 3000);
      }
    },
    ...options
  });

  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('reconnecting', () => {
    logger.warn('Redis client reconnecting');
  });

  await client.connect();
  return client;
}

// Initialiser les clients Redis
async function initRedis() {
  try {
    // Client principal pour les opérations générales
    redisClient = await createRedisClient();

    // Clients pub/sub pour Socket.IO adapter
    redisPubClient = await createRedisClient();
    redisSubClient = redisPubClient.duplicate();
    await redisSubClient.connect();

    logger.info('Redis clients initialized successfully');
    return { redisClient, redisPubClient, redisSubClient };
  } catch (err) {
    logger.error('Failed to initialize Redis', { error: err.message });
    throw err;
  }
}

// Gestion des utilisateurs en ligne avec Redis
class RedisOnlineUsersManager {
  constructor(client) {
    this.client = client;
    this.prefix = 'online_users:';
    this.userSocketsPrefix = 'user_sockets:';
  }

  // Ajouter un socket à un utilisateur
  async addUserSocket(userId, socketId) {
    try {
      const key = `${this.userSocketsPrefix}${userId}`;
      await this.client.sAdd(key, socketId);
      await this.client.expire(key, 86400); // 24 heures
      
      // Ajouter l'utilisateur à l'ensemble des utilisateurs en ligne
      await this.client.sAdd(`${this.prefix}all`, userId);
      return true;
    } catch (err) {
      logger.error('Redis addUserSocket error', { error: err.message, userId });
      return false;
    }
  }

  // Retirer un socket d'un utilisateur
  async removeUserSocket(userId, socketId) {
    try {
      const key = `${this.userSocketsPrefix}${userId}`;
      await this.client.sRem(key, socketId);
      
      // Vérifier si l'utilisateur a encore des sockets actifs
      const socketCount = await this.client.sCard(key);
      if (socketCount === 0) {
        await this.client.del(key);
        await this.client.sRem(`${this.prefix}all`, userId);
      }
      
      return socketCount === 0; // true si l'utilisateur est complètement déconnecté
    } catch (err) {
      logger.error('Redis removeUserSocket error', { error: err.message, userId });
      return false;
    }
  }

  // Obtenir tous les sockets d'un utilisateur
  async getUserSockets(userId) {
    try {
      const key = `${this.userSocketsPrefix}${userId}`;
      const sockets = await this.client.sMembers(key);
      return sockets || [];
    } catch (err) {
      logger.error('Redis getUserSockets error', { error: err.message, userId });
      return [];
    }
  }

  // Vérifier si un utilisateur est en ligne
  async isUserOnline(userId) {
    try {
      return await this.client.sIsMember(`${this.prefix}all`, userId);
    } catch (err) {
      logger.error('Redis isUserOnline error', { error: err.message, userId });
      return false;
    }
  }

  // Obtenir tous les utilisateurs en ligne
  async getAllOnlineUsers() {
    try {
      const users = await this.client.sMembers(`${this.prefix}all`);
      return users || [];
    } catch (err) {
      logger.error('Redis getAllOnlineUsers error', { error: err.message });
      return [];
    }
  }

  // Nettoyer un utilisateur (en cas de déconnexion forcée)
  async cleanupUser(userId) {
    try {
      const key = `${this.userSocketsPrefix}${userId}`;
      await this.client.del(key);
      await this.client.sRem(`${this.prefix}all`, userId);
      return true;
    } catch (err) {
      logger.error('Redis cleanupUser error', { error: err.message, userId });
      return false;
    }
  }
}

// Fermer les connexions Redis
async function closeRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis client closed');
    }
    if (redisPubClient) {
      await redisPubClient.quit();
      logger.info('Redis pub client closed');
    }
    if (redisSubClient) {
      await redisSubClient.quit();
      logger.info('Redis sub client closed');
    }
  } catch (err) {
    logger.error('Error closing Redis connections', { error: err.message });
  }
}

// Gérer la fermeture gracieuse
process.on('SIGTERM', closeRedis);
process.on('SIGINT', closeRedis);

module.exports = {
  initRedis,
  closeRedis,
  getRedisClient: () => redisClient,
  getRedisPubClient: () => redisPubClient,
  getRedisSubClient: () => redisSubClient,
  RedisOnlineUsersManager
};
