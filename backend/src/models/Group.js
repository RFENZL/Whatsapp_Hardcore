const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  // Nom du groupe
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // Description du groupe
  description: {
    type: String,
    default: '',
    maxlength: 500
  },

  // Avatar/photo du groupe
  avatar: {
    type: String,
    default: ''
  },

  // Créateur du groupe
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Administrateurs du groupe
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Membres du groupe
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],

  // Paramètres du groupe
  settings: {
    // Qui peut envoyer des messages
    whoCanSendMessages: {
      type: String,
      enum: ['all', 'admins'],
      default: 'all'
    },
    // Qui peut modifier les infos du groupe
    whoCanEditInfo: {
      type: String,
      enum: ['all', 'admins'],
      default: 'admins'
    },
    // Qui peut ajouter des membres
    whoCanAddMembers: {
      type: String,
      enum: ['all', 'admins'],
      default: 'admins'
    }
  },

  // Référence à la conversation associée
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
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

  // Groupe actif ou archivé/supprimé
  isActive: {
    type: Boolean,
    default: true
  }
});

// Index pour recherche rapide
GroupSchema.index({ 'members.user': 1 });
GroupSchema.index({ creator: 1 });
GroupSchema.index({ name: 'text', description: 'text' });

// Mise à jour automatique du updatedAt
GroupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode pour vérifier si un utilisateur est admin
GroupSchema.methods.isAdmin = function(userId) {
  return this.admins.some(adminId => adminId.toString() === userId.toString());
};

// Méthode pour vérifier si un utilisateur est membre
GroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

module.exports = mongoose.model('Group', GroupSchema);
