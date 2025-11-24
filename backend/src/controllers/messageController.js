const Message = require('../models/Message');
const User = require('../models/User');
const { getIO } = require('../socket/io');

exports.create = async (req, res) => {
  const { recipient_id, content, clientId } = req.body;
  if (!recipient_id) return res.status(400).json({ error: 'recipient required' });
  const recipient = await User.findById(recipient_id);
  if (!recipient) return res.status(404).json({ error: 'recipient not found' });

  const msg = await Message.create({
    sender: req.user._id,
    recipient: recipient._id,
    content: content || ''
  });

  const io = getIO();
  if (io) {
    const payload = {
      _id: String(msg._id),
      sender: String(msg.sender),
      recipient: String(msg.recipient),
      content: msg.content,
      createdAt: msg.createdAt,
      status: msg.status,
      edited: msg.edited,
      deleted: msg.deleted,
      clientId: clientId || null
    };
    io.to(String(recipient._id)).emit('message:new', payload);
    io.to(String(req.user._id)).emit('message:new', payload);
  }

  res.status(201).json(msg);
};

exports.getWithUser = async (req, res) => {
  const otherId = req.params.user_id;
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '30'), 100);
  const skip = (page - 1) * limit;

  await Message.updateMany(
    { sender: otherId, recipient: req.user._id, status: { $ne: 'read' } },
    { $set: { status: 'read' } }
  );

  const items = await Message.find({
    $or: [
      { sender: req.user._id, recipient: otherId },
      { sender: otherId, recipient: req.user._id }
    ]
  }).sort({ createdAt: -1 }).skip(skip).limit(limit);

  res.json({ page, limit, items });
};

exports.conversations = async (req, res) => {
  const userId = req.user._id;
  const pipeline = [
    { $match: { $or: [ { sender: userId }, { recipient: userId } ] } },
    { $sort: { createdAt: -1 } },
    { $group: {
      _id: { other: { $cond: [{ $eq: ['$sender', userId] }, '$recipient', '$sender'] } },
      lastMessage: { $first: '$$ROOT' },
      unread: { $sum: { $cond: [{ $and: [{ $eq: ['$recipient', userId] }, { $ne: ['$status', 'read'] }] }, 1, 0] } }
    }},
    { $lookup: { from: 'users', localField: '_id.other', foreignField: '_id', as: 'otherUser' } },
    { $unwind: '$otherUser' },
    { $project: { otherUser: { _id: 1, username: 1, avatar: 1, status: 1, lastSeen: 1 }, lastMessage: 1, unread: 1 } },
    { $sort: { 'lastMessage.createdAt': -1 } }
  ];
  const convos = await Message.aggregate(pipeline);
  res.json(convos);
};

exports.update = async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (String(msg.sender) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
  msg.content = req.body.content ?? msg.content;
  msg.edited = true;
  await msg.save();
  res.json(msg);
};

exports.remove = async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (String(msg.sender) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
  msg.deleted = true;
  await msg.save();
  res.json({ message: 'ok' });
};

exports.markRead = async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (String(msg.recipient) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
  msg.status = 'read';
  await msg.save();
  res.json(msg);
};
