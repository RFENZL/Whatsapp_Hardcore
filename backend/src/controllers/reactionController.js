const Reaction = require('../models/Reaction');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { getIO } = require('../socket/io');

// Ajouter ou mettre à jour une réaction
exports.toggle = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji || emoji.trim().length === 0) {
    return res.status(400).json({ error: 'Emoji required' });
  }

  // Vérifier que le message existe
  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Vérifier l'accès au message
  if (message.conversation) {
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } else if (String(message.sender) !== String(req.user._id) &&
             String(message.recipient) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Vérifier si l'utilisateur a déjà réagi
  const existingReaction = await Reaction.findOne({
    message: messageId,
    user: req.user._id
  });

  let action = 'added';
  let reaction;

  if (existingReaction) {
    if (existingReaction.emoji === emoji.trim()) {
      // Retirer la réaction si c'est la même
      await Reaction.findByIdAndDelete(existingReaction._id);
      action = 'removed';
      reaction = existingReaction;
    } else {
      // Mettre à jour avec le nouvel emoji
      existingReaction.emoji = emoji.trim();
      existingReaction.createdAt = new Date();
      await existingReaction.save();
      action = 'updated';
      reaction = existingReaction;
    }
  } else {
    // Créer nouvelle réaction
    reaction = await Reaction.create({
      message: messageId,
      user: req.user._id,
      emoji: emoji.trim()
    });
    action = 'added';
  }

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    let recipients = [];
    
    if (message.conversation) {
      const conversation = await Conversation.findById(message.conversation);
      recipients = conversation.participants.map(String);
    } else {
      recipients = [String(message.sender), String(message.recipient)];
    }

    recipients.forEach(userId => {
      io.to(userId).emit('reaction:updated', {
        messageId: String(messageId),
        userId: String(req.user._id),
        emoji: action === 'removed' ? null : emoji.trim(),
        action
      });
    });
  }

  if (action === 'removed') {
    res.json({ message: 'Reaction removed' });
  } else {
    res.json(reaction);
  }
};

// Obtenir toutes les réactions d'un message
exports.listByMessage = async (req, res) => {
  const { messageId } = req.params;

  // Vérifier que le message existe
  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Vérifier l'accès
  if (message.conversation) {
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } else if (String(message.sender) !== String(req.user._id) &&
             String(message.recipient) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const reactions = await Reaction.find({ message: messageId })
    .populate('user', 'username avatar')
    .sort({ createdAt: 1 });

  // Grouper par emoji
  const grouped = reactions.reduce((acc, reaction) => {
    const emoji = reaction.emoji;
    if (!acc[emoji]) {
      acc[emoji] = {
        emoji,
        count: 0,
        users: []
      };
    }
    acc[emoji].count++;
    acc[emoji].users.push({
      _id: reaction.user._id,
      username: reaction.user.username,
      avatar: reaction.user.avatar
    });
    return acc;
  }, {});

  res.json({
    reactions,
    grouped: Object.values(grouped)
  });
};

// Supprimer une réaction spécifique
exports.remove = async (req, res) => {
  const { reactionId } = req.params;

  const reaction = await Reaction.findById(reactionId);
  if (!reaction) {
    return res.status(404).json({ error: 'Reaction not found' });
  }

  // Seul l'auteur de la réaction peut la supprimer
  if (String(reaction.user) !== String(req.user._id)) {
    return res.status(403).json({ error: 'You can only remove your own reactions' });
  }

  const messageId = reaction.message;
  await Reaction.findByIdAndDelete(reactionId);

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    const message = await Message.findById(messageId);
    if (message) {
      let recipients = [];
      
      if (message.conversation) {
        const conversation = await Conversation.findById(message.conversation);
        recipients = conversation.participants.map(String);
      } else {
        recipients = [String(message.sender), String(message.recipient)];
      }

      recipients.forEach(userId => {
        io.to(userId).emit('reaction:updated', {
          messageId: String(messageId),
          userId: String(req.user._id),
          emoji: null,
          action: 'removed'
        });
      });
    }
  }

  res.json({ message: 'Reaction removed successfully' });
};

// Obtenir les réactions d'un utilisateur dans une conversation
exports.listByUser = async (req, res) => {
  const { conversationId } = req.params;
  const { userId } = req.query;

  const targetUserId = userId || req.user._id;

  // Vérifier l'accès à la conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Trouver tous les messages de la conversation
  const messages = await Message.find({
    conversation: conversationId
  }).select('_id');

  const messageIds = messages.map(m => m._id);

  const reactions = await Reaction.find({
    message: { $in: messageIds },
    user: targetUserId
  })
    .populate('message')
    .sort({ createdAt: -1 });

  res.json(reactions);
};
