const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  location: {
    country: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    region: { type: String, default: '' },
    city: { type: String, default: '' },
    timezone: { type: String, default: '' }
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  logoutTime: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

SessionSchema.index({ user: 1, loginTime: -1 });

module.exports = mongoose.model('Session', SessionSchema);
