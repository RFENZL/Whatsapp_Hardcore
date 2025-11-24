const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, minlength: 3, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: null }
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
