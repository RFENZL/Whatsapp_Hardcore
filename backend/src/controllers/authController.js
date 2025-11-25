const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const logger = require('../utils/logger');
const { sendVerificationEmail, sendPasswordResetEmail, sendNewSessionNotification } = require('../utils/email');
const { getLocationFromIP } = require('../utils/geolocation');
const { alertNewLogin } = require('../utils/securityAlerts');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

const signToken = (user) => jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });
const signRefreshToken = (user) => jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: '7d' });

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
    
    // Générer un token de vérification email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    
    await user.save();
    
    // Envoyer l'email de vérification (ne bloque pas l'inscription)
    sendVerificationEmail(user, verificationToken).catch(err => {
      logger.error('Failed to send verification email', { userId: user._id, error: err.message });
    });
    
    // Créer une session
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const location = await getLocationFromIP(ipAddress);
    
    const session = await Session.create({
      user: user._id,
      ipAddress,
      userAgent,
      location,
      isActive: true
    });
    
    // Envoyer l'alerte de nouvelle inscription (en arrière-plan)
    alertNewLogin({ user, session, isNewLocation: true }).catch(err => {
      logger.error('Failed to send registration alert', { userId: user._id, error: err.message });
    });
    
    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    
    // Stocker le refresh token dans la base de données
    user.refreshToken = refreshToken;
    await user.save();
    
    // Définir les cookies HttpOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });
    
    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    // Gérer les erreurs de duplication MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    logger.error('Registration error', { error: error.message, stack: error.stack });
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
  const user = await User.findOne({ email }).select('+password +deletedAt');
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  // Vérifier si le compte est supprimé (soft delete)
  if (user.deletedAt) {
    return res.status(403).json({ error: 'Account has been deleted' });
  }
  
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  user.status = 'online';
  user.lastSeen = new Date();
  await user.save();
  
  // Limiter le nombre de sessions actives (max 5)
  const MAX_SESSIONS = 5;
  const activeSessions = await Session.countDocuments({ user: user._id, isActive: true });
  
  if (activeSessions >= MAX_SESSIONS) {
    // Déconnecter la session la plus ancienne
    const oldestSession = await Session.findOne({ user: user._id, isActive: true })
      .sort({ loginTime: 1 });
    if (oldestSession) {
      oldestSession.isActive = false;
      oldestSession.logoutTime = new Date();
      await oldestSession.save();
    }
  }
  
  // Créer une session
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const location = await getLocationFromIP(ipAddress);
  
  const session = await Session.create({
    user: user._id,
    ipAddress,
    userAgent,
    location,
    isActive: true
  });
  
  // Vérifier si c'est une nouvelle localisation (notification de sécurité)
  const recentSessions = await Session.find({
    user: user._id,
    _id: { $ne: session._id },
    loginTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 derniers jours
  }).sort({ loginTime: -1 }).limit(10);
  
  const isNewLocation = !recentSessions.some(s => 
    s.location?.city === location.city && s.location?.country === location.country
  );
  
  if (isNewLocation && recentSessions.length > 0) {
    // Envoyer notification en arrière-plan (ne bloque pas le login)
    sendNewSessionNotification(user, session).catch(err => {
      logger.error('Failed to send session notification', { userId: user._id, error: err.message });
    });
  }
  
  // Envoyer l'alerte de connexion (en arrière-plan)
  alertNewLogin({ user, session, isNewLocation: isNewLocation && recentSessions.length > 0 }).catch(err => {
    logger.error('Failed to send login alert', { userId: user._id, error: err.message });
  });
  
  const token = signToken(user);
  const refreshToken = signRefreshToken(user);
  
  // Stocker le refresh token
  user.refreshToken = refreshToken;
  await user.save();
  
  // Définir les cookies HttpOnly
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
  });
  
  res.json({ user: user.toJSON(), sessionId: session._id });
};

exports.logout = async (req, res) => {
  const user = req.user;
  user.status = 'offline';
  user.lastSeen = new Date();
  user.refreshToken = null; // Invalider le refresh token
  await user.save();
  
  // Mettre à jour la dernière session active
  await Session.findOneAndUpdate(
    { user: user._id, isActive: true },
    { isActive: false, logoutTime: new Date() },
    { sort: { loginTime: -1 } }
  );
  
  // Supprimer les cookies
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  
  res.json({ message: 'ok' });
};

exports.refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Générer un nouveau token d'accès
    const newToken = signToken(user);
    
    // Mettre à jour le cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.json({ success: true });
  } catch (err) {
    logger.warn('Invalid refresh token', { error: err.message });
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });
  
  try {
    const user = await User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken');
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    
    logger.info('Email verified', { userId: user._id });
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    logger.error('Email verification failed', { error: err.message });
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Ne pas révéler si l'email existe
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 heure
    await user.save();
    
    sendPasswordResetEmail(user, resetToken).catch(err => {
      logger.error('Failed to send password reset email', { userId: user._id, error: err.message });
    });
    
    logger.info('Password reset requested', { userId: user._id });
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    logger.error('Forgot password failed', { error: err.message });
    res.status(500).json({ error: 'Request failed' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  try {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires +password');
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = null; // Invalider tous les refresh tokens
    await user.save();
    
    logger.info('Password reset successfully', { userId: user._id });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    logger.error('Password reset failed', { error: err.message });
    res.status(500).json({ error: 'Reset failed' });
  }
};

exports.me = async (req, res) => {
  // req.user est défini par le middleware auth
  const user = req.user;
  res.json({ user: user.toJSON() });
};
