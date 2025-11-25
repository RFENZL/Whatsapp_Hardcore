const Notification = require('../models/Notification');
const { getIO } = require('../socket/io');
const logger = require('../utils/logger');

// Obtenir toutes les notifications de l'utilisateur
exports.getAll = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;
    
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('data.fromUserId', 'username avatar')
        .lean(),
      Notification.countDocuments(query),
      Notification.getUnreadCount(req.user._id)
    ]);
    
    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    logger.error('Get notifications error', { error: err.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
};

// Obtenir le nombre de notifications non lues
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (err) {
    logger.error('Get unread count error', { error: err.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Marquer une notification comme lue
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.markAsRead();
    
    // Émettre l'événement via Socket.IO
    const io = getIO();
    if (io) {
      io.to(String(req.user._id)).emit('notification:read', {
        notificationId: String(notification._id)
      });
    }
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    logger.error('Mark notification as read error', { error: err.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Marquer toutes les notifications comme lues
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);
    
    // Émettre l'événement via Socket.IO
    const io = getIO();
    if (io) {
      io.to(String(req.user._id)).emit('notification:all-read');
    }
    
    res.json({ 
      message: 'All notifications marked as read', 
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    logger.error('Mark all notifications as read error', { error: err.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Archiver une notification
exports.archive = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.archive();
    
    res.json({ message: 'Notification archived', notification });
  } catch (err) {
    logger.error('Archive notification error', { error: err.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to archive notification' });
  }
};

// Supprimer une notification
exports.remove = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    logger.error('Delete notification error', { error: err.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Supprimer toutes les notifications lues
exports.clearRead = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
      status: 'read'
    });
    
    res.json({ 
      message: 'Read notifications cleared', 
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    logger.error('Clear read notifications error', { error: err.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to clear read notifications' });
  }
};

// Fonction utilitaire pour créer une notification (utilisée par d'autres contrôleurs)
exports.createNotification = async (notificationData) => {
  try {
    const notification = await Notification.createNotification(notificationData);
    
    // Émettre l'événement via Socket.IO
    const io = getIO();
    if (io) {
      io.to(String(notificationData.userId)).emit('notification:new', {
        _id: String(notification._id),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        actionUrl: notification.actionUrl,
        priority: notification.priority,
        createdAt: notification.createdAt
      });
    }
    
    return notification;
  } catch (err) {
    logger.error('Create notification error', { error: err.message, data: notificationData });
    throw err;
  }
};

module.exports = exports;
