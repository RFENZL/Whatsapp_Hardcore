const User = require('../models/User');

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
