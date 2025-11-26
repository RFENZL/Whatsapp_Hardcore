const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  // Message sur lequel porte la réaction
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true
  },

  // Utilisateur qui a réagi
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Type de réaction (emoji)
  emoji: {
    type: String,
    required: true,
    maxlength: 10
  },

  // Date de la réaction
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Un utilisateur ne peut avoir qu'une seule réaction par message
ReactionSchema.index({ message: 1, user: 1 }, { unique: true });

// Index pour compter les réactions par message
ReactionSchema.index({ message: 1, emoji: 1 });

module.exports = mongoose.model('Reaction', ReactionSchema);
