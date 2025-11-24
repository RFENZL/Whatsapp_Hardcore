const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });

exports.validateRegister = [
  body('email').isEmail(),
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
];

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, username, password, avatar } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(400).json({ error: 'Email or username used' });
  
  try {
    const user = new User({ 
      email, 
      username, 
      password, 
      avatar,
      status: 'online',
      lastSeen: new Date()
    });
    await user.save();
    
    // Créer une session
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await Session.create({
      user: user._id,
      ipAddress,
      userAgent,
      isActive: true
    });
    
    const token = signToken(user);
    res.status(201).json({ token, user: user.toJSON() });
  } catch (error) {
    // Gérer les erreurs de duplication MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.validateLogin = [
  body('email').isEmail(),
  body('password').notEmpty()
];

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  user.status = 'online';
  user.lastSeen = new Date();
  await user.save();
  
  // Créer une session
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const session = await Session.create({
    user: user._id,
    ipAddress,
    userAgent,
    isActive: true
  });
  
  const token = signToken(user);
  res.json({ token, user: user.toJSON(), sessionId: session._id });
};

exports.logout = async (req, res) => {
  const user = req.user;
  user.status = 'offline';
  user.lastSeen = new Date();
  await user.save();
  
  // Mettre à jour la dernière session active
  await Session.findOneAndUpdate(
    { user: user._id, isActive: true },
    { isActive: false, logoutTime: new Date() },
    { sort: { loginTime: -1 } }
  );
  
  res.json({ message: 'ok' });
};
