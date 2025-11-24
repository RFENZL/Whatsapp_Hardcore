const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
  const user = new User({ email, username, password, avatar });
  await user.save();
  user.status = 'online';
  user.lastSeen = new Date();
  await user.save();
  const token = signToken(user);
  res.status(201).json({ token, user: user.toJSON() });
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
  const token = signToken(user);
  res.json({ token, user: user.toJSON() });
};

exports.logout = async (req, res) => {
  const user = req.user;
  user.status = 'offline';
  user.lastSeen = new Date();
  await user.save();
  res.json({ message: 'ok' });
};
