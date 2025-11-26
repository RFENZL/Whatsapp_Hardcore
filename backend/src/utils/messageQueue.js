const { getRedisClient } = require('./redis');
const logger = require('./logger');

class MessageQueue {
  constructor() {
    this.redisClient = null;
    this.prefix = 'offline_messages:';
  }

  // Initialiser avec Redis si disponible
  async init() {
    this.redisClient = getRedisClient();
    if (this.redisClient) {
      logger.info('MessageQueue initialized with Redis');
    } else {
      logger.warn('MessageQueue: Redis not available, using in-memory fallback');
    }
  }

  // Ajouter un message à la queue d'un utilisateur hors ligne
  async enqueue(userId, message) {
    try {
      const key = `${this.prefix}${userId}`;
      const messageData = {
        ...message,
        queuedAt: new Date().toISOString()
      };

      if (this.redisClient) {
        // Utiliser Redis List
        await this.redisClient.rPush(key, JSON.stringify(messageData));
        // Définir une expiration de 7 jours
        await this.redisClient.expire(key, 7 * 24 * 60 * 60);
        logger.debug('Message enqueued in Redis', { userId, messageId: message._id });
      } else {
        // Fallback en mémoire (non persistant)
        if (!global.offlineMessagesMemory) {
          global.offlineMessagesMemory = new Map();
        }
        if (!global.offlineMessagesMemory.has(userId)) {
          global.offlineMessagesMemory.set(userId, []);
        }
        global.offlineMessagesMemory.get(userId).push(messageData);
        logger.debug('Message enqueued in memory', { userId, messageId: message._id });
      }

      return true;
    } catch (err) {
      logger.error('MessageQueue enqueue error', { error: err.message, userId });
      return false;
    }
  }

  // Récupérer tous les messages en attente pour un utilisateur
  async dequeue(userId) {
    try {
      const key = `${this.prefix}${userId}`;
      let messages = [];

      if (this.redisClient) {
        // Récupérer tous les messages de la liste Redis
        const messagesStr = await this.redisClient.lRange(key, 0, -1);
        messages = messagesStr.map(str => JSON.parse(str));
        
        // Supprimer la liste après récupération
        if (messages.length > 0) {
          await this.redisClient.del(key);
        }
        
        logger.debug('Messages dequeued from Redis', { userId, count: messages.length });
      } else {
        // Fallback en mémoire
        if (global.offlineMessagesMemory && global.offlineMessagesMemory.has(userId)) {
          messages = global.offlineMessagesMemory.get(userId) || [];
          global.offlineMessagesMemory.delete(userId);
        }
        
        logger.debug('Messages dequeued from memory', { userId, count: messages.length });
      }

      return messages;
    } catch (err) {
      logger.error('MessageQueue dequeue error', { error: err.message, userId });
      return [];
    }
  }

  // Obtenir le nombre de messages en attente
  async getQueueSize(userId) {
    try {
      const key = `${this.prefix}${userId}`;

      if (this.redisClient) {
        return await this.redisClient.lLen(key);
      } else {
        if (global.offlineMessagesMemory && global.offlineMessagesMemory.has(userId)) {
          return global.offlineMessagesMemory.get(userId).length;
        }
        return 0;
      }
    } catch (err) {
      logger.error('MessageQueue getQueueSize error', { error: err.message, userId });
      return 0;
    }
  }

  // Supprimer les messages d'un utilisateur
  async clear(userId) {
    try {
      const key = `${this.prefix}${userId}`;

      if (this.redisClient) {
        await this.redisClient.del(key);
      } else {
        if (global.offlineMessagesMemory) {
          global.offlineMessagesMemory.delete(userId);
        }
      }

      logger.debug('MessageQueue cleared', { userId });
      return true;
    } catch (err) {
      logger.error('MessageQueue clear error', { error: err.message, userId });
      return false;
    }
  }

  // Vérifier si un utilisateur a des messages en attente
  async hasMessages(userId) {
    const size = await this.getQueueSize(userId);
    return size > 0;
  }
}

// Instance singleton
const messageQueue = new MessageQueue();

module.exports = messageQueue;
