const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const onlineUsers = new Map();

function broadcastUserStatus(io, user, status) {
  io.emit('user-status', { userId: user._id.toString(), status, lastSeen: user.lastSeen });
}

module.exports = function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch (e) {
      logger.warn('Socket auth failed', { error: e.message });
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    logger.info(`User connected: ${user.username}`, { userId: user._id.toString() });

    socket.join(user._id.toString());

    if (!onlineUsers.has(user._id.toString())) onlineUsers.set(user._id.toString(), new Set());
    onlineUsers.get(user._id.toString()).add(socket.id);

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();
    broadcastUserStatus(io, user, 'online');
    io.emit('user-online', { userId: user._id.toString() });

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
    socket.on('typing', ({ to }, cb) => {
      io.to(String(to)).emit('typing', { from: user._id.toString() });
      if (timers.has(to)) clearTimeout(timers.get(to));
      timers.set(to, setTimeout(() => {
        io.to(String(to)).emit('typing-stopped', { from: user._id.toString() });
      }, 3000));
      cb && cb({ ok: true });
    });

    socket.on('disconnect', async () => {
      const set = onlineUsers.get(user._id.toString());
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(user._id.toString());
          user.status = 'offline';
          user.lastSeen = new Date();
          await user.save();
          broadcastUserStatus(io, user, 'offline');
          io.emit('user-offline', { userId: user._id.toString(), lastSeen: user.lastSeen });
          logger.info(`User disconnected: ${user.username}`, { userId: user._id.toString() });
        }
      }
    });
  });
};
