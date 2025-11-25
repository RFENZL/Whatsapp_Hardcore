const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  // Type de conversation : direct (1-1) ou group
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
    required: true
  },

  // Participants de la conversation (pour conversations directes et groupes)
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // Référence au groupe (si type = 'group')
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },

  // Dernier message envoyé (pour affichage dans la liste)
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  // Date du dernier message
  lastMessageAt: {
    type: Date,
    default: Date.now
  },

  // Compteurs de messages non lus par utilisateur
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },

  // Métadonnées
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Conversation archivée par utilisateur
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Conversation muté par utilisateur
  mutedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Conversation épinglée par utilisateur
  pinnedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

// Index pour recherche rapide des conversations d'un utilisateur
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
ConversationSchema.index({ type: 1, participants: 1 });

// Mise à jour automatique du updatedAt
ConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', ConversationSchema);
