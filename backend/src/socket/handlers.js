const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Contact = require('../models/Contact');
const { getRedisClient, RedisOnlineUsersManager } = require('../utils/redis');
const messageQueue = require('../utils/messageQueue');
const logger = require('../utils/logger');

// Utiliser Redis si disponible, sinon fallback vers Map en mémoire
let onlineUsersManager = null;
const onlineUsersMemory = new Map();

// Helper pour vérifier si un utilisateur est en ligne
async function isUserOnline(userId) {
  if (onlineUsersManager) {
    return await onlineUsersManager.isUserOnline(userId);
  } else {
    return onlineUsersMemory.has(userId);
  }
}

// Helper pour obtenir les contacts en ligne d'un utilisateur
async function getOnlineContacts(userId) {
  try {
    const contacts = await Contact.find({
      $or: [{ user: userId }, { contact: userId }],
      status: 'accepted'
    }).lean();

    const contactIds = contacts.map(c => 
      String(c.user) === String(userId) ? String(c.contact) : String(c.user)
    );

    const onlineContactIds = [];
    for (const contactId of contactIds) {
      if (await isUserOnline(contactId)) {
        onlineContactIds.push(contactId);
      }
    }

    return onlineContactIds;
  } catch (err) {
    logger.error('getOnlineContacts error', { error: err.message, userId });
    return [];
  }
}

function broadcastUserStatus(io, user, status) {
  io.emit('user-status', { userId: user._id.toString(), status, lastSeen: user.lastSeen });
}

module.exports = function initSocket(io) {
  // Initialiser le gestionnaire d'utilisateurs en ligne
  const redisClient = getRedisClient();
  if (redisClient) {
    onlineUsersManager = new RedisOnlineUsersManager(redisClient);
    logger.info('Using Redis for online users management');
  } else {
    logger.info('Using in-memory Map for online users management');
  }

  // Log ALL connection attempts before middleware
  io.engine.on("connection", (rawSocket) => {
    logger.info('Raw Socket.IO engine connection', { 
      socketId: rawSocket.id,
      transport: rawSocket.transport?.name || 'unknown'
    });
    
    rawSocket.on('close', (reason) => {
      logger.info('Raw socket closed', { socketId: rawSocket.id, reason });
    });
    
    rawSocket.on('error', (err) => {
      logger.error('Raw socket error', { socketId: rawSocket.id, error: err.message });
    });
  });

  io.use(async (socket, next) => {
    logger.info('Socket.IO middleware called', { socketId: socket.id });
    
    try {
      // Try to get token from auth, query, or cookies
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      // If no token in auth/query, try to get it from cookies
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        token = cookies.token;
      }
      
      logger.info('Socket connection attempt', { 
        socketId: socket.id, 
        hasAuthToken: !!socket.handshake.auth?.token,
        hasQueryToken: !!socket.handshake.query?.token,
        hasCookieToken: !!token,
        cookies: socket.handshake.headers.cookie ? 'present' : 'absent'
      });
      
      if (!token) {
        logger.warn('Socket connection rejected: no token', { socketId: socket.id });
        return next(new Error('Unauthorized - No token'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      const user = await User.findById(decoded.id);
      if (!user) {
        logger.warn('Socket connection rejected: user not found', { userId: decoded.id, socketId: socket.id });
        return next(new Error('Unauthorized - User not found'));
      }
      socket.user = user;
      logger.info('Socket authenticated successfully', { userId: user._id.toString(), username: user.username, socketId: socket.id });
      next();
    } catch (e) {
      logger.error('Socket auth failed', { error: e.message, stack: e.stack, socketId: socket.id });
      next(new Error('Unauthorized - ' + e.message));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    logger.info(`User connected: ${user.username}`, { userId: user._id.toString(), socketId: socket.id });

    // Rejoindre la room de l'utilisateur
    const userRoom = user._id.toString();
    socket.join(userRoom);
    logger.info(`User joined room: ${userRoom}`, { socketId: socket.id });

    // Rejoindre les rooms de toutes les conversations de l'utilisateur
    const userConversations = await Conversation.find({
      participants: user._id
    }).select('_id');
    
    userConversations.forEach(conv => {
      const convRoom = `conversation:${conv._id.toString()}`;
      socket.join(convRoom);
      logger.info(`User joined conversation room: ${convRoom}`, { socketId: socket.id });
    });

    // Gérer les utilisateurs en ligne
    if (onlineUsersManager) {
      await onlineUsersManager.addUserSocket(user._id.toString(), socket.id);
    } else {
      if (!onlineUsersMemory.has(user._id.toString())) {
        onlineUsersMemory.set(user._id.toString(), new Set());
      }
      onlineUsersMemory.get(user._id.toString()).add(socket.id);
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();
    
    // Broadcast seulement aux contacts en ligne
    const onlineContacts = await getOnlineContacts(user._id.toString());
    onlineContacts.forEach(contactId => {
      io.to(contactId).emit('user-status', { 
        userId: user._id.toString(), 
        status: 'online', 
        lastSeen: user.lastSeen 
      });
    });

    // Envoyer les messages en queue (pour utilisateurs hors ligne)
    const queuedMessages = await messageQueue.dequeue(user._id.toString());
    if (queuedMessages.length > 0) {
      socket.emit('queued-messages', { 
        messages: queuedMessages,
        count: queuedMessages.length 
      });
      logger.info(`Delivered ${queuedMessages.length} queued messages`, { userId: user._id.toString() });
    }

    socket.on('send-message', async (payload, cb) => {
      try {
        const { to, content } = payload || {};
        if (!to) throw new Error('recipient required');
        if ((content || '').length > 5000) throw new Error('too long');
        const recipient = await User.findById(to);
        if (!recipient) throw new Error('recipient not found');

        const msg = await Message.create({
          sender: user._id,
          recipient: recipient._id,
          content: content || ''
        });

        const out = {
          _id: String(msg._id),
          sender: String(msg.sender),
          recipient: String(msg.recipient),
          content: msg.content,
          createdAt: msg.createdAt,
          status: msg.status,
          edited: msg.edited,
          deleted: msg.deleted
        };

        io.to(String(recipient._id)).emit('message:new', out);
        io.to(String(user._id)).emit('message:new', out);

        cb && cb({ ok: true, id: msg._id });
      } catch (err) {
        logger.error('Socket send-message error', { error: err.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: err.message });
      }
    });

    socket.on('message-read', async ({ messageId }, cb) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) throw new Error('not found');
        if (String(msg.recipient) !== String(user._id)) throw new Error('forbidden');
        msg.status = 'read';
        await msg.save();
        io.to(String(msg.sender)).emit('message:read', { messageId: String(msg._id) });
        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Socket message-read error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    const timers = new Map();
    socket.on('typing', ({ conversationId }, cb) => {
      try {
        if (!conversationId) {
          return cb && cb({ ok: false, error: 'conversationId required' });
        }
        
        // Émettre l'événement typing dans la room de la conversation
        io.to(`conversation:${conversationId}`).emit('typing', { 
          from: user._id.toString(), 
          conversationId 
        });
        
        if (timers.has(conversationId)) clearTimeout(timers.get(conversationId));
        timers.set(conversationId, setTimeout(() => {
          io.to(`conversation:${conversationId}`).emit('typing-stopped', { 
            from: user._id.toString(), 
            conversationId 
          });
        }, 3000));
        
        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Socket typing error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Rejoindre une room de conversation
    socket.on('join-conversation', async ({ conversationId }, cb) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new Error('Conversation not found');
        
        if (!conversation.participants.some(p => String(p) === String(user._id))) {
          throw new Error('Access denied');
        }
        
        socket.join(`conversation:${conversationId}`);
        cb && cb({ ok: true });
      } catch (e) {
        logger.warn('Socket join-conversation error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Récupérer les messages manqués après reconnexion
    socket.on('get-missed-messages', async (payload, cb) => {
      try {
        const { lastSync } = payload || {};
        const since = lastSync ? new Date(lastSync) : user.lastSeen;
        
        if (!since) {
          return cb && cb({ ok: true, messages: [] });
        }
        
        // Récupérer les messages des conversations de l'utilisateur depuis la dernière synchronisation
        const missedMessages = await Message.find({
          conversation: { $in: userConversations.map(c => c._id) },
          createdAt: { $gt: since },
          sender: { $ne: user._id }
        })
          .sort({ createdAt: 1 })
          .limit(500)
          .populate('sender', 'username avatar')
          .lean();
        
        const formattedMessages = missedMessages.map(msg => ({
          _id: String(msg._id),
          sender: String(msg.sender._id),
          recipient: msg.recipient ? String(msg.recipient) : null,
          conversation: String(msg.conversation),
          group: msg.group ? String(msg.group) : null,
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt,
          status: msg.status,
          edited: msg.edited,
          deleted: msg.deleted
        }));
        
        cb && cb({ ok: true, messages: formattedMessages, count: formattedMessages.length });
      } catch (e) {
        logger.error('Socket get-missed-messages error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Synchroniser tous les messages d'une conversation
    socket.on('sync-messages', async (payload, cb) => {
      try {
        const { conversationId, since, limit = 100 } = payload || {};
        
        if (!conversationId) {
          return cb && cb({ ok: false, error: 'conversationId required' });
        }
        
        // Vérifier l'accès à la conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return cb && cb({ ok: false, error: 'Conversation not found' });
        }
        
        if (!conversation.participants.some(p => String(p) === String(user._id))) {
          return cb && cb({ ok: false, error: 'Access denied' });
        }
        
        // Construire la requête
        const query = {
          conversation: conversationId,
          deletedFor: { $ne: user._id }
        };
        
        if (since) {
          query.createdAt = { $gt: new Date(since) };
        }
        
        // Récupérer les messages
        const messages = await Message.find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .populate('sender', 'username avatar')
          .populate('replyTo', 'content sender')
          .populate('media')
          .lean();
        
        const formattedMessages = messages.reverse().map(msg => ({
          _id: String(msg._id),
          sender: msg.sender ? {
            _id: String(msg.sender._id),
            username: msg.sender.username,
            avatar: msg.sender.avatar
          } : null,
          recipient: msg.recipient ? String(msg.recipient) : null,
          conversation: String(msg.conversation),
          group: msg.group ? String(msg.group) : null,
          content: msg.content,
          type: msg.type,
          mediaUrl: msg.mediaUrl,
          mediaName: msg.mediaName,
          media: msg.media ? String(msg.media) : null,
          replyTo: msg.replyTo ? String(msg.replyTo._id) : null,
          mentions: msg.mentions ? msg.mentions.map(String) : [],
          createdAt: msg.createdAt,
          status: msg.status,
          edited: msg.edited,
          editedAt: msg.editedAt,
          deleted: msg.deleted
        }));
        
        logger.info('Messages synchronized', { 
          userId: user._id.toString(), 
          conversationId, 
          count: formattedMessages.length 
        });
        
        cb && cb({ 
          ok: true, 
          messages: formattedMessages, 
          count: formattedMessages.length,
          conversationId 
        });
      } catch (e) {
        logger.error('Socket sync-messages error', { error: e.message, userId: user._id.toString() });
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on('disconnect', async () => {
      logger.info('User disconnecting', { userId: user._id.toString(), socketId: socket.id });
      
      // Retirer le socket de l'utilisateur
      let isFullyDisconnected = false;
      
      if (onlineUsersManager) {
        isFullyDisconnected = await onlineUsersManager.removeUserSocket(user._id.toString(), socket.id);
      } else {
        const set = onlineUsersMemory.get(user._id.toString());
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) {
            onlineUsersMemory.delete(user._id.toString());
            isFullyDisconnected = true;
          }
        }
      }
      
      // Si l'utilisateur n'a plus de sockets actifs, le marquer comme offline
      if (isFullyDisconnected) {
        user.status = 'offline';
        user.lastSeen = new Date();
        await user.save();
        
        // Broadcast seulement aux contacts en ligne
        const onlineContacts = await getOnlineContacts(user._id.toString());
        onlineContacts.forEach(contactId => {
          io.to(contactId).emit('user-status', { 
            userId: user._id.toString(), 
            status: 'offline', 
            lastSeen: user.lastSeen 
          });
        });
        
        logger.info(`User fully disconnected: ${user.username}`, { userId: user._id.toString() });
      }
    });
  });
};
