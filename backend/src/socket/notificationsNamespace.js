const Notification = require('../models/Notification');
const { createRateLimiter } = require('./middlewares');
const logger = require('../utils/logger');

// Rate limiter pour les notifications
const notificationLimiter = createRateLimiter({ maxRequests: 100, windowMs: 60000 });

module.exports = function initNotificationsNamespace(io) {
  const notificationsNsp = io.of('/notifications');

  logger.info('Notifications namespace initialized');

  notificationsNsp.on('connection', async (socket) => {
    const user = socket.user;
    logger.info('User connected to /notifications', { 
      userId: user._id.toString(), 
      socketId: socket.id 
    });

    // Rejoindre la room de l'utilisateur
    socket.join(user._id.toString());

    // Obtenir les notifications non lues
    socket.on('notifications:unread', async (payload, cb) => {
      try {
        const unreadCount = await Notification.getUnreadCount(user._id);
        const notifications = await Notification.find({
          user: user._id,
          status: 'unread'
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('data.fromUserId', 'username avatar')
          .lean();

        cb && cb({ 
          ok: true, 
          count: unreadCount,
          notifications 
        });
      } catch (e) {
        logger.error('Get unread notifications error', { 
          error: e.message, 
          userId: user._id.toString() 
        });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Marquer une notification comme lue
    socket.use(notificationLimiter('notification:read'));
    socket.on('notification:read', async ({ notificationId }, cb) => {
      try {
        const notification = await Notification.findOne({
          _id: notificationId,
          user: user._id
        });

        if (!notification) {
          return cb && cb({ ok: false, error: 'Notification not found' });
        }

        await notification.markAsRead();

        // Émettre confirmation
        socket.emit('notification:read-confirmed', {
          notificationId: String(notification._id)
        });

        cb && cb({ ok: true });
      } catch (e) {
        logger.error('Mark notification as read error', { 
          error: e.message, 
          userId: user._id.toString() 
        });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Marquer toutes les notifications comme lues
    socket.on('notifications:mark-all-read', async (payload, cb) => {
      try {
        const result = await Notification.markAllAsRead(user._id);

        socket.emit('notifications:all-read-confirmed', {
          count: result.modifiedCount
        });

        cb && cb({ ok: true, count: result.modifiedCount });
      } catch (e) {
        logger.error('Mark all notifications as read error', { 
          error: e.message, 
          userId: user._id.toString() 
        });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Supprimer une notification
    socket.on('notification:delete', async ({ notificationId }, cb) => {
      try {
        const notification = await Notification.findOneAndDelete({
          _id: notificationId,
          user: user._id
        });

        if (!notification) {
          return cb && cb({ ok: false, error: 'Notification not found' });
        }

        socket.emit('notification:deleted-confirmed', {
          notificationId
        });

        cb && cb({ ok: true });
      } catch (e) {
        logger.error('Delete notification error', { 
          error: e.message, 
          userId: user._id.toString() 
        });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // S'abonner aux notifications d'un type spécifique
    socket.on('notifications:subscribe', ({ types }, cb) => {
      try {
        if (!Array.isArray(types)) {
          return cb && cb({ ok: false, error: 'types must be an array' });
        }

        types.forEach(type => {
          socket.join(`notification-type:${type}`);
        });

        logger.info('User subscribed to notification types', {
          userId: user._id.toString(),
          types
        });

        cb && cb({ ok: true, subscribedTo: types });
      } catch (e) {
        logger.error('Subscribe to notifications error', { 
          error: e.message, 
          userId: user._id.toString() 
        });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Se désabonner
    socket.on('notifications:unsubscribe', ({ types }, cb) => {
      try {
        if (!Array.isArray(types)) {
          return cb && cb({ ok: false, error: 'types must be an array' });
        }

        types.forEach(type => {
          socket.leave(`notification-type:${type}`);
        });

        logger.info('User unsubscribed from notification types', {
          userId: user._id.toString(),
          types
        });

        cb && cb({ ok: true, unsubscribedFrom: types });
      } catch (e) {
        logger.error('Unsubscribe from notifications error', { 
          error: e.message, 
          userId: user._id.toString() 
        });
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Déconnexion
    socket.on('disconnect', () => {
      logger.info('User disconnected from /notifications', { 
        userId: user._id.toString(), 
        socketId: socket.id 
      });
    });
  });

  return notificationsNsp;
};
