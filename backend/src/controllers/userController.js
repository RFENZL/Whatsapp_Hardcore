const User = require('../models/User');
const Session = require('../models/Session');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const Fuse = require('fuse.js');

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
  if (username) user.username = username;
  if (avatar !== undefined) user.avatar = avatar;
  if (bio !== undefined) {
    if (bio.length > 500) return res.status(400).json({ error: 'Bio trop longue (max 500 caractères)' });
    user.bio = bio;
  }
  await user.save();
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
  
  await Session.updateMany(
    query,
    { isActive: false, logoutTime: new Date() }
  );
  
  res.json({ message: 'All sessions terminated successfully' });
};
