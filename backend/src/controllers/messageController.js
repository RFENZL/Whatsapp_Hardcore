const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Group = require('../models/Group');
const User = require('../models/User');
const Media = require('../models/Media');
const { getIO } = require('../socket/io');

exports.create = async (req, res) => {
  const {
    recipient_id,
    conversation_id,
    content,
    clientId,
    type,
    mediaUrl,
    mediaName,
    mediaSize,
    mediaMimeType,
    media_id,
    replyTo,
    mentions
  } = req.body;

  let conversation, recipient, group;

  // Message direct ou de groupe
  if (conversation_id) {
    conversation = await Conversation.findById(conversation_id)
      .populate('group')
      .populate('participants');
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    if (!conversation.participants.some(p => String(p._id) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (conversation.type === 'group') {
      group = conversation.group;
      
      // Vérifier les permissions d'envoi
      if (group.settings.whoCanSendMessages === 'admins' && !group.isAdmin(req.user._id)) {
        return res.status(403).json({ error: 'Only admins can send messages in this group' });
      }
    }
  } else if (recipient_id) {
    // Message direct (créer conversation si nécessaire)
    recipient = await User.findById(recipient_id);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, recipient_id], $size: 2 }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [req.user._id, recipient_id]
      });
    }
  } else {
    return res.status(400).json({ error: 'Either recipient_id or conversation_id required' });
  }

  const messageData = {
    sender: req.user._id,
    conversation: conversation._id,
    content: content || '',
    type: type || 'text'
  };

  if (conversation.type === 'direct' && recipient) {
    messageData.recipient = recipient._id;
  }

  if (group) {
    messageData.group = group._id;
  }

  // Média
  if (media_id) {
    messageData.media = media_id;
  } else if (type && type !== 'text' && type !== 'system') {
    if (mediaUrl) messageData.mediaUrl = mediaUrl;
    if (mediaName) messageData.mediaName = mediaName;
    if (mediaSize != null) messageData.mediaSize = mediaSize;
    if (mediaMimeType) messageData.mediaMimeType = mediaMimeType;
  }

  // Répondre à un message
  if (replyTo) {
    messageData.replyTo = replyTo;
  }

  // Mentions
  if (mentions && Array.isArray(mentions)) {
    messageData.mentions = mentions;
  }

  const msg = await Message.create(messageData);

  // Mettre à jour la conversation
  conversation.lastMessage = msg._id;
  conversation.lastMessageAt = msg.createdAt;
  
  // Incrémenter les compteurs de non-lus
  conversation.participants.forEach(participantId => {
    if (String(participantId) !== String(req.user._id)) {
      const currentCount = conversation.unreadCount.get(String(participantId)) || 0;
      conversation.unreadCount.set(String(participantId), currentCount + 1);
    }
  });
  
  await conversation.save();

  // Émettre via Socket.IO
  const io = getIO();
  if (io) {
    const payload = {
      _id: String(msg._id),
      sender: String(msg.sender),
      recipient: msg.recipient ? String(msg.recipient) : null,
      conversation: String(msg.conversation),
      group: msg.group ? String(msg.group) : null,
      content: msg.content,
      type: msg.type,
      mediaUrl: msg.mediaUrl,
      mediaName: msg.mediaName,
      mediaSize: msg.mediaSize,
      mediaMimeType: msg.mediaMimeType,
      media: msg.media ? String(msg.media) : null,
      replyTo: msg.replyTo ? String(msg.replyTo) : null,
      mentions: msg.mentions ? msg.mentions.map(String) : [],
      createdAt: msg.createdAt,
      status: msg.status,
      edited: msg.edited,
      deleted: msg.deleted,
      clientId: clientId || null
    };

    conversation.participants.forEach(participantId => {
      io.to(String(participantId)).emit('message:new', payload);
    });
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

// Recherche de messages
exports.search = async (req, res) => {
  const { q, senderId, conversationId, page = 1, limit = 20 } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Search query required' });
  }

  const query = {
    $or: [
      { sender: req.user._id },
      { recipient: req.user._id }
    ],
    deleted: false,
    content: { $regex: q.trim(), $options: 'i' }
  };

  // Filtre par expéditeur
  if (senderId) {
    query.sender = senderId;
  }

  // Filtre par conversation
  if (conversationId) {
    query.conversation = conversationId;
    delete query.$or; // Dans une conversation, pas besoin du filtre sender/recipient
    
    // Vérifier l'accès à la conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [messages, total] = await Promise.all([
    Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar'),
    Message.countDocuments(query)
  ]);

  res.json({
    messages,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit))
  });
};

// Obtenir les messages d'une conversation
exports.getByConversation = async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 30 } = req.query;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (!conversation.participants.includes(req.user._id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: { $ne: req.user._id }
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .populate('media');

  res.json({
    messages: messages.reverse(),
    page: parseInt(page),
    limit: parseInt(limit)
  });
};

// Transférer un message
exports.forward = async (req, res) => {
  const { messageId } = req.params;
  const { conversationIds } = req.body;

  if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
    return res.status(400).json({ error: 'Conversation IDs required' });
  }

  const originalMessage = await Message.findById(messageId);
  if (!originalMessage) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Vérifier l'accès au message original
  if (String(originalMessage.sender) !== String(req.user._id) &&
      String(originalMessage.recipient) !== String(req.user._id)) {
    const conversation = await Conversation.findById(originalMessage.conversation);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const forwardedMessages = [];
  const io = getIO();

  for (const convId of conversationIds) {
    const targetConversation = await Conversation.findById(convId);
    
    if (!targetConversation || !targetConversation.participants.includes(req.user._id)) {
      continue; // Skip les conversations non accessibles
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      conversation: convId,
      group: targetConversation.group || null,
      content: originalMessage.content,
      type: originalMessage.type,
      media: originalMessage.media,
      mediaUrl: originalMessage.mediaUrl,
      mediaName: originalMessage.mediaName,
      mediaSize: originalMessage.mediaSize,
      mediaMimeType: originalMessage.mediaMimeType,
      forwardedFrom: originalMessage._id
    });

    // Mettre à jour la conversation
    targetConversation.lastMessage = newMessage._id;
    targetConversation.lastMessageAt = newMessage.createdAt;
    
    targetConversation.participants.forEach(participantId => {
      if (String(participantId) !== String(req.user._id)) {
        const currentCount = targetConversation.unreadCount.get(String(participantId)) || 0;
        targetConversation.unreadCount.set(String(participantId), currentCount + 1);
      }
    });
    
    await targetConversation.save();

    forwardedMessages.push(newMessage);

    // Notifier via Socket.IO
    if (io) {
      targetConversation.participants.forEach(participantId => {
        io.to(String(participantId)).emit('message:new', {
          _id: String(newMessage._id),
          sender: String(newMessage.sender),
          conversation: String(newMessage.conversation),
          content: newMessage.content,
          type: newMessage.type,
          forwardedFrom: String(originalMessage._id),
          createdAt: newMessage.createdAt
        });
      });
    }
  }

  res.json({ message: 'Messages forwarded successfully', count: forwardedMessages.length });
};

// Marquer comme livré (pour les messages directs)
exports.markDelivered = async (req, res) => {
  const { messageIds } = req.body;

  if (!messageIds || !Array.isArray(messageIds)) {
    return res.status(400).json({ error: 'Message IDs required' });
  }

  await Message.updateMany(
    {
      _id: { $in: messageIds },
      recipient: req.user._id,
      status: 'sent'
    },
    {
      $set: { status: 'delivered' }
    }
  );

  const io = getIO();
  if (io) {
    const messages = await Message.find({ _id: { $in: messageIds } });
    messages.forEach(msg => {
      io.to(String(msg.sender)).emit('message:delivered', {
        messageId: String(msg._id)
      });
    });
  }

  res.json({ message: 'Messages marked as delivered' });
};
