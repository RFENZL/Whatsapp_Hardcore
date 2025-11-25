const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blocked: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: '',
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Un même contact ne peut exister qu'une fois par user
ContactSchema.index({ owner: 1, contact: 1 }, { unique: true });

module.exports = mongoose.model('Contact', ContactSchema);
