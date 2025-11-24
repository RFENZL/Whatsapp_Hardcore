const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, maxlength: 5000, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['sent', 'received', 'read'], default: 'sent' },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false }
});

MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
