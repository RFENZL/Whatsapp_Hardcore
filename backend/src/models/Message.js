const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Pour messages directs
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  
  // Pour messages de groupe
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },

  // Texte principal
  content: { type: String, maxlength: 5000, default: '' },

  // Type de message (texte / média)
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
    default: 'text'
  },

  // Référence au média (si type != 'text')
  media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },

  // Infos média optionnelles (rétrocompatibilité)
  mediaUrl: { type: String, default: '' },
  mediaName: { type: String, default: '' },
  mediaSize: { type: Number, default: 0 },
  mediaMimeType: { type: String, default: '' },

  // Message de réponse (reply/quote)
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  // Message transféré
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  // Mentions (@user)
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdAt: { type: Date, default: Date.now, index: true },
  
  // Statuts de lecture par utilisateur (pour groupes)
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  
  status: { type: String, enum: ['pending', 'sent', 'delivered', 'read'], default: 'pending' },
  
  // Timestamps pour chaque état
  statusTimestamps: {
    pending: { type: Date, default: Date.now },
    sent: { type: Date, default: null },
    delivered: { type: Date, default: null },
    read: { type: Date, default: null }
  },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  
  // Suppression pour moi uniquement
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Message temporaire/éphémère
  expiresAt: { type: Date, default: null, index: true },
  
  // Message épinglé dans le groupe
  isPinned: { type: Boolean, default: false },
  pinnedAt: { type: Date, default: null },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ group: 1, createdAt: -1 });

// Index texte pour la recherche
MessageSchema.index({ content: 'text' });

// Middleware pour mettre à jour les timestamps de statut
MessageSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (!this.statusTimestamps) {
      this.statusTimestamps = {};
    }
    this.statusTimestamps[this.status] = new Date();
  }
  next();
});

module.exports = mongoose.model('Message', MessageSchema);
