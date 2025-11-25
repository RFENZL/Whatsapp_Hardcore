const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { createNotification } = require('../controllers/notificationController');
const { createRateLimiter, HeartbeatManager, ConflictManager } = require('./middlewares');
const messageQueue = require('../utils/messageQueue');
const logger = require('../utils/logger');

// Instances des managers
const heartbeatManager = new HeartbeatManager();
const conflictManager = new ConflictManager();

// Rate limiters par événement
const messageLimiter = createRateLimiter({ maxRequests: 50, windowMs: 60000 });
const typingLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60000 });

module.exports = function initMessagesNamespace(io) {
  const messagesNsp = io.of('/messages');

  logger.info('Messages namespace initialized');

  messagesNsp.on('connection', async (socket) => {
    const user = socket.user;
    logger.info('User connected to /messages', { 
      userId: user._id.toString(), 
      socketId: socket.id 
    });

    // Rejoindre les rooms
    socket.join(user._id.toString());

    const userConversations = await Conversation.find({
      participants: user._id
    }).select('_id');
    
    userConversations.forEach(conv => {
      socket.join(`conversation:${conv._id.toString()}`);
    });

    // Heartbeat
    socket.on('heartbeat', (payload, cb) => {
      const clientTimestamp = payload?.timestamp || Date.now();
      const serverTimestamp = Date.now();
      const latency = serverTimestamp - clientTimestamp;

      heartbeatManager.recordHeartbeat(socket.id, user._id.toString(), latency);

      cb && cb({ 
        ok: true, 
        serverTimestamp,
        latency,
        metrics: heartbeatManager.getMetrics(user._id.toString())
      });
    });

    // Typing indicator avec rate limiting
    socket.use(typingLimiter('typing'));
    socket.on('typing', ({ conversationId }, cb) => {
      try {
        if (!conversationId) {
          return cb && cb({ ok: false, error: 'conversationId required' });
        }
        
        messagesNsp.to(`conversation:${conversationId}`).emit('typing', { 
          from: user._id.toString(), 
          conversationId 
        });
        
        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Typing error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Marquer message comme lu
    socket.on('message:read', async ({ messageId }, cb) => {
      try {
        const msg = await Message.findById(messageId).populate('conversation');
        if (!msg) throw new Error('Message not found');
        
        // Vérifier les permissions
        const conversation = msg.conversation;
        if (!conversation.participants.some(p => String(p) === String(user._id))) {
          throw new Error('Access denied');
        }

        msg.status = 'read';
        await msg.save();

        // Émettre à tous les participants
        messagesNsp.to(`conversation:${String(conversation._id)}`).emit('message:read', { 
          messageId: String(msg._id),
          readBy: String(user._id),
          conversationId: String(conversation._id)
        });

        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Message read error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Verrouiller un message pour édition
    socket.on('message:lock', async ({ messageId }, cb) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) throw new Error('Message not found');
        
        if (String(msg.sender) !== String(user._id)) {
          throw new Error('Only sender can lock message for editing');
        }

        const result = conflictManager.lock(messageId, user._id.toString(), socket.id);
        
        if (!result.success) {
          return cb && cb({ 
            ok: false, 
            error: result.message,
            lockedBy: result.lockedBy
          });
        }

        // Notifier les autres participants
        messagesNsp.to(`conversation:${String(msg.conversation)}`).emit('message:locked', {
          messageId,
          lockedBy: user._id.toString()
        });

        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Message lock error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Déverrouiller un message
    socket.on('message:unlock', async ({ messageId }, cb) => {
      try {
        const result = conflictManager.unlock(messageId, user._id.toString());
        
        if (!result.success) {
          return cb && cb({ ok: false, error: result.message });
        }

        const msg = await Message.findById(messageId);
        if (msg) {
          messagesNsp.to(`conversation:${String(msg.conversation)}`).emit('message:unlocked', {
            messageId
          });
        }

        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Message unlock error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Mettre à jour la dernière vue d'une conversation
    socket.on('conversation:view', async ({ conversationId }, cb) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new Error('Conversation not found');
        
        if (!conversation.participants.some(p => String(p) === String(user._id))) {
          throw new Error('Access denied');
        }

        user.lastSeenPerConversation.set(conversationId, new Date());
        await user.save();

        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Conversation view error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Obtenir les métriques de heartbeat
    socket.on('metrics:get', (payload, cb) => {
      const metrics = heartbeatManager.getMetrics(user._id.toString());
      cb && cb({ ok: true, metrics });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      heartbeatManager.removeHeartbeat(socket.id);
      conflictManager.releaseSocketLocks(socket.id);
      logger.info('User disconnected from /messages', { 
        userId: user._id.toString(), 
        socketId: socket.id 
      });
    });
  });

  // Nettoyer périodiquement
  setInterval(() => {
    heartbeatManager.cleanup();
    conflictManager.cleanup();
  }, 60000); // Chaque minute

  return messagesNsp;
};
