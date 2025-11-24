const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Texte principal
  content: { type: String, maxlength: 5000, default: '' },

  // Type de message (texte / média)
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'file'],
    default: 'text'
  },

  // Infos média optionnelles
  mediaUrl: { type: String, default: '' },
  mediaName: { type: String, default: '' },
  mediaSize: { type: Number, default: 0 },
  mediaMimeType: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['sent', 'received', 'read'], default: 'sent' },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false }
});

MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
