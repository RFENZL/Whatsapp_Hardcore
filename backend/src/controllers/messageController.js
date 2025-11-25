const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Group = require('../models/Group');
const User = require('../models/User');
const Media = require('../models/Media');
const { getIO } = require('../socket/io');
const logger = require('../utils/logger');

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

  // Extract mentions from content (@username) if not already provided
  if (!mentions || mentions.length === 0) {
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = [];
    let match;
    while ((match = mentionRegex.exec(content || '')) !== null) {
      mentionedUsernames.push(match[1]);
    }
    
    // Find user IDs for mentioned usernames
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({ 
        username: { $in: mentionedUsernames } 
      }).select('_id');
      messageData.mentions = mentionedUsers.map(u => u._id);
    }
  } else if (mentions && Array.isArray(mentions)) {
    messageData.mentions = mentions;
  }

  const msg = await Message.create(messageData);

  // Mettre à jour le statut à 'sent' après création
  msg.status = 'sent';
  if (!msg.statusTimestamps) {
    msg.statusTimestamps = {};
  }
  msg.statusTimestamps.sent = new Date();
  await msg.save();

  // Mettre à jour la conversation
  conversation.lastMessage = msg._id;
  conversation.lastMessageAt = msg.createdAt;
  
  // Incrémenter les compteurs de non-lus
    conversation.participants.forEach(participant => {
      const participantId = participant && participant._id ? String(participant._id) : String(participant);
      if (participantId !== String(req.user._id)) {
        const currentCount = conversation.unreadCount.get(participantId) || 0;
        conversation.unreadCount.set(participantId, currentCount + 1);
      }
    });
  
  await conversation.save();

  // Créer des notifications pour les mentions
  if (mentions && Array.isArray(mentions) && mentions.length > 0) {
    const { createNotification } = require('./notificationController');
    
    for (const mentionedUserId of mentions) {
      if (String(mentionedUserId) !== String(req.user._id)) {
        try {
          await createNotification({
            userId: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned',
            message: `${req.user.username} mentioned you in a message`,
            data: {
              messageId: msg._id,
              conversationId: conversation._id,
              groupId: group?._id,
              fromUserId: req.user._id
            },
            actionUrl: `/conversations/${conversation._id}`,
            priority: 'high'
          });
        } catch (err) {
          logger.error('Failed to create mention notification', { 
            error: err.message, 
            mentionedUserId 
          });
        }
      }
    }
  }

  // Émettre via Socket.IO
  const io = getIO();
  if (io) {
    const payload = {
      _id: String(msg._id),
      sender: {
        _id: String(req.user._id),
        username: req.user.username,
        avatar: req.user.avatar || null
      },
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
      reactions: [], // Nouveau message n'a pas encore de réactions
      createdAt: msg.createdAt,
      status: msg.status,
      edited: msg.edited,
      deleted: msg.deleted,
      clientId: clientId || null
    };

    conversation.participants.forEach(participant => {
      const pid = participant && participant._id ? String(participant._id) : String(participant);
      io.to(pid).emit('message:new', payload);
      logger.info('Message emitted via Socket.IO', {
        messageId: payload._id,
        to: pid,
        sender: payload.sender._id,
        conversationId: payload.conversation
      });
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
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'reactions',
      select: 'emoji user createdAt',
      populate: { path: 'user', select: 'username avatar' }
    });

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
  msg.editedAt = new Date();
  await msg.save();
  
  // Émettre via Socket.IO pour mettre à jour en temps réel
  const io = getIO();
  if (io) {
    const conversation = await msg.populate('conversation');
    if (conversation && conversation.participants) {
      conversation.participants.forEach(participant => {
        const pid = participant && participant._id ? String(participant._id) : String(participant);
        io.to(pid).emit('message:updated', {
          _id: String(msg._id),
          content: msg.content,
          edited: msg.edited,
          editedAt: msg.editedAt
        });
      });
    }
  }
  
  res.json(msg);
};

exports.remove = async (req, res) => {
  const msg = await Message.findById(req.params.id).populate('conversation');
  if (!msg) return res.status(404).json({ error: 'Not found' });
  if (String(msg.sender) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
  msg.deleted = true;
  await msg.save();
  
  // Émettre via Socket.IO pour notifier la suppression
  const io = getIO();
  if (io && msg.conversation) {
    const conversation = msg.conversation;
    if (conversation.participants) {
      conversation.participants.forEach(participant => {
        const pid = participant && participant._id ? String(participant._id) : String(participant);
        io.to(pid).emit('message:deleted', {
          _id: String(msg._id),
          conversation: String(msg.conversation._id),
          deletedBy: String(req.user._id)
        });
      });
    }
  }
  
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
    // Utiliser l'index texte MongoDB pour une recherche performante
    $text: { $search: q.trim() }
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
    if (!conversation || !conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [messages, total] = await Promise.all([
    Message.find(query, {
      // Ajouter le score de pertinence de la recherche texte
      score: { $meta: 'textScore' }
    })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar')
      .populate({
        path: 'reactions',
        select: 'emoji user createdAt',
        populate: { path: 'user', select: 'username avatar' }
      }),
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

  if (!conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
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
    .populate('media')
    .populate({
      path: 'reactions',
      select: 'emoji user createdAt',
      populate: { path: 'user', select: 'username avatar' }
    });

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
    if (!conversation || !conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const forwardedMessages = [];
  const io = getIO();

  for (const convId of conversationIds) {
    const targetConversation = await Conversation.findById(convId);
    
    if (!targetConversation || !targetConversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
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
    
    targetConversation.participants.forEach(participant => {
      const pid = participant && participant._id ? String(participant._id) : String(participant);
      if (pid !== String(req.user._id)) {
        const currentCount = targetConversation.unreadCount.get(pid) || 0;
        targetConversation.unreadCount.set(pid, currentCount + 1);
      }
    });
    
    await targetConversation.save();

    forwardedMessages.push(newMessage);

    // Créer des notifications de forward pour les participants
    const { createNotification } = require('./notificationController');
    targetConversation.participants.forEach(async (participant) => {
      const pid = participant && participant._id ? String(participant._id) : String(participant);
      if (pid !== String(req.user._id)) {
        try {
          await createNotification({
            userId: pid,
            type: 'message',
            title: 'Message forwarded',
            message: `${req.user.username} forwarded a message to you`,
            data: {
              messageId: newMessage._id,
              conversationId: convId,
              fromUserId: req.user._id,
              metadata: { forwarded: true }
            },
            actionUrl: `/conversations/${convId}`,
            priority: 'normal'
          });
        } catch (err) {
          logger.error('Failed to create forward notification', { 
            error: err.message, 
            userId: pid 
          });
        }
      }
    });

    // Notifier via Socket.IO
    if (io) {
      targetConversation.participants.forEach(participant => {
        const pid = participant && participant._id ? String(participant._id) : String(participant);
        io.to(pid).emit('message:new', {
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

// Épingler un message dans un groupe
exports.pinMessage = async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) return res.status(404).json({ error: 'Message not found' });

  // Vérifier que c'est un message de groupe
  if (!message.group) {
    return res.status(400).json({ error: 'Only group messages can be pinned' });
  }

  const group = await Group.findById(message.group);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent épingler des messages
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can pin messages' });
  }

  message.isPinned = true;
  message.pinnedAt = new Date();
  message.pinnedBy = req.user._id;
  await message.save();

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      conversation.participants.forEach(participant => {
        io.to(String(participant)).emit('message:pinned', {
          messageId: String(message._id),
          groupId: String(message.group)
        });
      });
    }
  }

  res.json({ message: 'Message pinned successfully' });
};

// Désépingler un message
exports.unpinMessage = async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) return res.status(404).json({ error: 'Message not found' });

  if (!message.group) {
    return res.status(400).json({ error: 'Only group messages can be unpinned' });
  }

  const group = await Group.findById(message.group);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent désépingler des messages
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can unpin messages' });
  }

  message.isPinned = false;
  message.pinnedAt = null;
  message.pinnedBy = null;
  await message.save();

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      conversation.participants.forEach(participant => {
        io.to(String(participant)).emit('message:unpinned', {
          messageId: String(message._id),
          groupId: String(message.group)
        });
      });
    }
  }

  res.json({ message: 'Message unpinned successfully' });
};

// Obtenir les messages épinglés d'un groupe
exports.getPinnedMessages = async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  // Vérifier l'accès
  if (!conversation.participants.some(p => String(p) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const pinnedMessages = await Message.find({
    conversation: conversationId,
    isPinned: true,
    deleted: false
  })
    .populate('sender', 'username avatar')
    .populate('pinnedBy', 'username')
    .populate({
      path: 'reactions',
      select: 'emoji user createdAt',
      populate: { path: 'user', select: 'username avatar' }
    })
    .sort({ pinnedAt: -1 });

  res.json({ pinnedMessages });
};

// Recherche avancée de messages
exports.advancedSearch = async (req, res) => {
  const { 
    q, 
    conversationId, 
    type, 
    startDate, 
    endDate,
    senderId,
    page = 1, 
    limit = 20 
  } = req.query;

  const query = {
    $or: [
      { sender: req.user._id },
      { recipient: req.user._id }
    ],
    deleted: false
  };

  // Recherche textuelle
  if (q && q.trim().length > 0) {
    query.$text = { $search: q.trim() };
  }

  // Filtre par conversation
  if (conversationId) {
    query.conversation = conversationId;
    delete query.$or;
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  // Filtre par type de message
  if (type) {
    query.type = type;
  }

  // Filtre par date
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  // Filtre par expéditeur
  if (senderId) {
    query.sender = senderId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const projection = q && q.trim().length > 0 ? {
    score: { $meta: 'textScore' }
  } : {};

  const sortCriteria = q && q.trim().length > 0 
    ? { score: { $meta: 'textScore' }, createdAt: -1 }
    : { createdAt: -1 };

  const [messages, total] = await Promise.all([
    Message.find(query, projection)
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar')
      .populate('media')
      .populate({
        path: 'reactions',
        select: 'emoji user createdAt',
        populate: { path: 'user', select: 'username avatar' }
      }),
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
