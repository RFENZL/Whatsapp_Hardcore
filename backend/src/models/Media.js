const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  // Utilisateur qui a uploadé le média
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Type de média
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'other'],
    required: true
  },

  // Nom original du fichier
  originalName: {
    type: String,
    required: true
  },

  // Nom du fichier stocké (unique)
  filename: {
    type: String,
    required: true,
    unique: true
  },

  // URL d'accès au fichier
  url: {
    type: String,
    required: true
  },

  // Type MIME
  mimeType: {
    type: String,
    required: true
  },

  // Taille en octets
  size: {
    type: Number,
    required: true
  },

  // Dimensions (pour images/vidéos)
  dimensions: {
    width: { type: Number, default: null },
    height: { type: Number, default: null }
  },

  // Durée (pour vidéos/audio en secondes)
  duration: {
    type: Number,
    default: null
  },

  // Miniature/thumbnail (pour vidéos)
  thumbnail: {
    type: String,
    default: ''
  },

  // Hash du fichier (pour éviter les doublons)
  hash: {
    type: String,
    default: '',
    index: true
  },

  // Référence au message associé (optionnel)
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  // Référence à la conversation associée (optionnel)
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },

  // Statut du média
  status: {
    type: String,
    enum: ['uploading', 'ready', 'error', 'deleted'],
    default: 'ready'
  },

  // Métadonnées additionnelles
  metadata: {
    type: Map,
    of: String,
    default: {}
  },

  // Dates
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  deletedAt: {
    type: Date,
    default: null
  }
});

// Index composé pour recherche rapide
MediaSchema.index({ uploadedBy: 1, type: 1, uploadedAt: -1 });
MediaSchema.index({ conversation: 1, uploadedAt: -1 });

// Méthode pour marquer comme supprimé
MediaSchema.methods.softDelete = function() {
  this.status = 'deleted';
  this.deletedAt = Date.now();
  return this.save();
};

module.exports = mongoose.model('Media', MediaSchema);
