const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Destinataire de la notification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Type de notification
  type: {
    type: String,
    enum: [
      'message',           // Nouveau message
      'mention',           // Mention dans un message
      'reaction',          // Réaction à un message
      'group_invite',      // Invitation à un groupe
      'group_add',         // Ajouté à un groupe
      'group_remove',      // Retiré d'un groupe
      'contact_request',   // Demande de contact
      'contact_accepted',  // Contact accepté
      'message_deleted',   // Message supprimé
      'message_edited',    // Message édité
      'system'             // Notification système
    ],
    required: true,
    index: true
  },

  // Titre de la notification
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  // Message de la notification
  message: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Données supplémentaires selon le type
  data: {
    // ID du message concerné
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    
    // ID de la conversation concernée
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    },
    
    // ID du groupe concerné
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    
    // ID de l'utilisateur qui a déclenché la notification
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Autres données personnalisées
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },

  // Statut de la notification
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread',
    index: true
  },

  // Lien d'action (URL ou route)
  actionUrl: {
    type: String,
    default: null
  },

  // Priorité de la notification
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Date de lecture
  readAt: {
    type: Date,
    default: null
  },

  // Horodatage
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Date d'expiration (pour nettoyage automatique)
  expiresAt: {
    type: Date,
    default: null
  }
});

// Index composé pour les requêtes courantes
NotificationSchema.index({ user: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, type: 1, createdAt: -1 });

// Méthode pour marquer comme lue
NotificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Méthode pour archiver
NotificationSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Méthode statique pour créer une notification
NotificationSchema.statics.createNotification = async function(notificationData) {
  const notification = await this.create({
    user: notificationData.userId,
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    data: notificationData.data || {},
    actionUrl: notificationData.actionUrl,
    priority: notificationData.priority || 'normal',
    expiresAt: notificationData.expiresAt
  });

  return notification;
};

// Méthode statique pour obtenir les notifications non lues d'un utilisateur
NotificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ user: userId, status: 'unread' });
};

// Méthode statique pour marquer toutes les notifications comme lues
NotificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, status: 'unread' },
    { $set: { status: 'read', readAt: new Date() } }
  );
};

// Supprimer automatiquement les notifications expirées (TTL index)
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', NotificationSchema);
