const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, minlength: 3, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'away', 'busy', 'dnd'], 
    default: 'offline' 
  },
  customStatus: {
    message: { type: String, default: '', maxlength: 100 },
    emoji: { type: String, default: '' },
    expiresAt: { type: Date, default: null }
  },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: null },
  lastSeenPerConversation: {
    type: Map,
    of: Date,
    default: {}
  },
  refreshToken: { type: String, select: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  deletedAt: { type: Date, default: null, select: false }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
