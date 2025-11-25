const User = require('../models/User');
const Session = require('../models/Session');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const Fuse = require('fuse.js');
const { alertProfileModification, alertSecuritySettingsChange, alertAccountDeletion } = require('../utils/securityAlerts');
const logger = require('../utils/logger');

exports.getById = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { username, avatar, bio, status, _id, lastSeen } = user;
  res.json({ _id, username, avatar, bio, status, lastSeen });
};

exports.list = async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find({ deletedAt: null }, 'username avatar bio status lastSeen').sort({ status: -1, username: 1 }).skip(skip).limit(limit),
    User.countDocuments({ deletedAt: null })
  ]);
  res.json({ page, limit, total, items });
};

exports.updateProfile = async (req, res) => {
  const user = req.user;
  const { username, avatar, bio } = req.body;
  
  // Suivre les changements pour l'alerte
  const changes = {};
  
  if (username && username !== user.username) {
    changes.username = { old: user.username, new: username };
    user.username = username;
  }
  if (avatar !== undefined && avatar !== user.avatar) {
    changes.avatar = { old: user.avatar ? 'changed' : 'none', new: avatar ? 'set' : 'removed' };
    user.avatar = avatar;
  }
  if (bio !== undefined && bio !== user.bio) {
    if (bio.length > 500) return res.status(400).json({ error: 'Bio trop longue (max 500 caractères)' });
    changes.bio = { old: user.bio ? 'changed' : 'none', new: bio ? 'set' : 'removed' };
    user.bio = bio;
  }
  
  await user.save();
  
  // Envoyer l'alerte de modification de profil si des changements ont été faits
  if (Object.keys(changes).length > 0) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    alertProfileModification({ user, changes, ipAddress }).catch(err => {
      logger.error('Failed to send profile modification alert', { error: err.message });
    });
    
    logger.logUserAction('profile_update', {
      userId: user._id,
      username: user.username,
      changes,
      ipAddress,
    });
  }
  
  const { _id, status, lastSeen } = user;
  res.json({ _id, username: user.username, avatar: user.avatar, bio: user.bio, status, lastSeen });
};

exports.search = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  
  // Récupérer tous les utilisateurs non supprimés
  const allUsers = await User.find({ deletedAt: null }, 'username avatar bio status lastSeen').lean();
  
  // Configuration Fuse.js pour fuzzy search
  const fuse = new Fuse(allUsers, {
    keys: ['username', 'bio'],
    threshold: 0.4, // 0 = exact, 1 = tout correspond
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true
  });
  
  // Recherche fuzzy
  const results = fuse.search(q);
  
  // Limiter à 20 résultats et retourner uniquement les objets
  const items = results.slice(0, 20).map(r => r.item);
  
  res.json(items);
};

exports.deleteAccount = async (req, res) => {
  const userId = req.user._id;
  const user = req.user;
  
  // Soft delete : marquer l'utilisateur comme supprimé
  user.deletedAt = new Date();
  user.status = 'offline';
  user.refreshToken = null;
  await user.save();
  
  // Invalider toutes les sessions
  await Session.updateMany(
    { user: userId, isActive: true },
    { isActive: false, logoutTime: new Date() }
  );
  
  // Envoyer l'alerte de suppression de compte
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  alertAccountDeletion({ user, ipAddress }).catch(err => {
    logger.error('Failed to send account deletion alert', { error: err.message });
  });
  
  logger.logUserAction('account_deletion', {
    userId: user._id,
    username: user.username,
    email: user.email,
    ipAddress,
  });
  
  // Note: Les contacts, messages, etc. sont conservés mais l'utilisateur ne peut plus se connecter
  // Pour hard delete après 30 jours, créer un job cron séparé
  
  res.json({ message: 'Account deleted successfully' });
};

exports.getSessions = async (req, res) => {
  const sessions = await Session.find({ user: req.user._id })
    .sort({ loginTime: -1 })
    .limit(50);
  res.json(sessions);
};

exports.deleteSession = async (req, res) => {
  const { sessionId } = req.params;
  const session = await Session.findOne({ _id: sessionId, user: req.user._id });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.isActive = false;
  session.logoutTime = new Date();
  await session.save();
  
  // Alerte de modification des paramètres de sécurité
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  alertSecuritySettingsChange({
    user: req.user,
    action: 'delete_session',
    details: { sessionId, location: session.location },
    ipAddress,
  }).catch(err => {
    logger.error('Failed to send session deletion alert', { error: err.message });
  });
  
  logger.logUserAction('session_deleted', {
    userId: req.user._id,
    sessionId,
    ipAddress,
  });
  
  res.json({ message: 'Session deleted successfully' });
};

exports.deleteAllSessions = async (req, res) => {
  // Déconnecter de tous les appareils sauf la session actuelle
  const currentSessionId = req.body.currentSessionId; // Optionnel
  
  const query = { 
    user: req.user._id, 
    isActive: true 
  };
  
  if (currentSessionId) {
    query._id = { $ne: currentSessionId };
  }
  
  const result = await Session.updateMany(
    query,
    { isActive: false, logoutTime: new Date() }
  );
  
  // Alerte de modification des paramètres de sécurité
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  alertSecuritySettingsChange({
    user: req.user,
    action: 'delete_all_sessions',
    details: { sessionsDeleted: result.modifiedCount, exceptCurrent: !!currentSessionId },
    ipAddress,
  }).catch(err => {
    logger.error('Failed to send all sessions deletion alert', { error: err.message });
  });
  
  logger.logUserAction('all_sessions_deleted', {
    userId: req.user._id,
    sessionsDeleted: result.modifiedCount,
    ipAddress,
  });
  
  res.json({ message: 'All sessions terminated successfully' });
};
