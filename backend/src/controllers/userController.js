const User = require('../models/User');
const Session = require('../models/Session');
const Contact = require('../models/Contact');
const Message = require('../models/Message');

exports.getById = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { username, avatar, status, _id, lastSeen } = user;
  res.json({ _id, username, avatar, status, lastSeen });
};

exports.list = async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find({}, 'username avatar status lastSeen').sort({ status: -1, username: 1 }).skip(skip).limit(limit),
    User.countDocuments()
  ]);
  res.json({ page, limit, total, items });
};

exports.updateProfile = async (req, res) => {
  const user = req.user;
  const { username, avatar } = req.body;
  if (username) user.username = username;
  if (avatar !== undefined) user.avatar = avatar;
  await user.save();
  const { _id, status, lastSeen } = user;
  res.json({ _id, username: user.username, avatar: user.avatar, status, lastSeen });
};

exports.search = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const items = await User.find({ username: { $regex: q, $options: 'i' } }, 'username avatar status lastSeen').limit(20);
  res.json(items);
};

exports.deleteAccount = async (req, res) => {
  const userId = req.user._id;
  
  // Supprimer tous les contacts de l'utilisateur
  await Contact.deleteMany({ $or: [{ owner: userId }, { contact: userId }] });
  
  // Supprimer tous les messages de l'utilisateur
  await Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] });
  
  // Supprimer toutes les sessions de l'utilisateur
  await Session.deleteMany({ user: userId });
  
  // Supprimer l'utilisateur
  await User.findByIdAndDelete(userId);
  
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
  await Session.findByIdAndDelete(sessionId);
  res.json({ message: 'Session deleted successfully' });
};
