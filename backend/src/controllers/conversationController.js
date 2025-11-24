const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');
const { getIO } = require('../socket/io');

// Créer une conversation directe (1-1)
exports.createDirect = async (req, res) => {
  const { participantId } = req.body;
  
  if (!participantId) return res.status(400).json({ error: 'Participant required' });
  if (String(participantId) === String(req.user._id)) {
    return res.status(400).json({ error: 'Cannot create conversation with yourself' });
  }

  const participant = await User.findById(participantId);
  if (!participant) return res.status(404).json({ error: 'User not found' });

  // Vérifier si une conversation existe déjà
  const existing = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [req.user._id, participantId], $size: 2 }
  });

  if (existing) return res.json(existing);

  // Créer nouvelle conversation
  const conversation = await Conversation.create({
    type: 'direct',
    participants: [req.user._id, participantId]
  });

  res.status(201).json(conversation);
};

// Lister les conversations de l'utilisateur
exports.list = async (req, res) => {
  const { archived, search } = req.query;
  const userId = req.user._id;

  const query = { participants: userId };
  
  if (archived === 'true') {
    query.archivedBy = userId;
  } else {
    query.archivedBy = { $ne: userId };
  }

  let conversations = await Conversation.find(query)
    .populate('participants', 'username avatar status lastSeen')
    .populate('lastMessage')
    .populate('group', 'name avatar')
    .sort({ lastMessageAt: -1 });

  // Filtrer par recherche
  if (search) {
    const searchLower = search.toLowerCase();
    conversations = conversations.filter(conv => {
      if (conv.type === 'group' && conv.group) {
        return conv.group.name.toLowerCase().includes(searchLower);
      } else {
        const otherUser = conv.participants.find(p => String(p._id) !== String(userId));
        return otherUser && otherUser.username.toLowerCase().includes(searchLower);
      }
    });
  }

  // Calculer le nombre de non-lus pour chaque conversation
  const result = conversations.map(conv => {
    const unreadCount = conv.unreadCount.get(String(userId)) || 0;
    return {
      _id: conv._id,
      type: conv.type,
      participants: conv.participants,
      group: conv.group,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount,
      isArchived: conv.archivedBy.some(id => String(id) === String(userId)),
      isMuted: conv.mutedBy.some(id => String(id) === String(userId))
    };
  });

  res.json(result);
};

// Obtenir une conversation par ID
exports.getById = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('participants', 'username avatar status lastSeen')
    .populate('lastMessage')
    .populate('group');

  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  // Vérifier que l'utilisateur fait partie de la conversation
  if (!conversation.participants.some(p => String(p._id) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const unreadCount = conversation.unreadCount.get(String(req.user._id)) || 0;
  
  res.json({
    ...conversation.toObject(),
    unreadCount,
    isArchived: conversation.archivedBy.some(id => String(id) === String(req.user._id)),
    isMuted: conversation.mutedBy.some(id => String(id) === String(req.user._id))
  });
};

// Archiver une conversation
exports.archive = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  if (!conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!conversation.archivedBy.some(id => String(id) === String(req.user._id))) {
    conversation.archivedBy.push(req.user._id);
    await conversation.save();
  }

  res.json({ message: 'Conversation archived' });
};

// Désarchiver une conversation
exports.unarchive = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  if (!conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  conversation.archivedBy = conversation.archivedBy.filter(
    id => String(id) !== String(req.user._id)
  );
  await conversation.save();

  res.json({ message: 'Conversation unarchived' });
};

// Muet/Démuet une conversation
exports.toggleMute = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  if (!conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const isMuted = conversation.mutedBy.some(id => String(id) === String(req.user._id));
  
  if (isMuted) {
    conversation.mutedBy = conversation.mutedBy.filter(
      id => String(id) !== String(req.user._id)
    );
  } else {
    conversation.mutedBy.push(req.user._id);
  }
  
  await conversation.save();

  res.json({ message: isMuted ? 'Conversation unmuted' : 'Conversation muted', isMuted: !isMuted });
};

// Supprimer une conversation (pour l'utilisateur uniquement)
exports.remove = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  if (!conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Pour une conversation directe, on peut soit la marquer comme supprimée pour cet utilisateur
  // ou supprimer complètement si les deux l'ont supprimée
  if (conversation.type === 'direct') {
    // Option simple : archiver de manière permanente
    if (!conversation.archivedBy.some(id => String(id) === String(req.user._id))) {
      conversation.archivedBy.push(req.user._id);
    }
    await conversation.save();
    res.json({ message: 'Conversation deleted' });
  } else {
    // Pour les groupes, voir le contrôleur de groupe
    return res.status(400).json({ error: 'Use group leave endpoint for group conversations' });
  }
};

// Marquer tous les messages comme lus dans une conversation
exports.markAllRead = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  
  if (!conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Mettre à jour le compteur de non-lus
  conversation.unreadCount.set(String(req.user._id), 0);
  await conversation.save();

  // Mettre à jour les messages
  if (conversation.type === 'direct') {
    const otherParticipant = conversation.participants.find(
      p => String(p) !== String(req.user._id)
    );
    
    await Message.updateMany(
      {
        sender: otherParticipant,
        recipient: req.user._id,
        status: { $ne: 'read' }
      },
      { status: 'read' }
    );
  } else {
    // Pour les groupes, ajouter l'utilisateur dans readBy
    await Message.updateMany(
      {
        conversation: conversation._id,
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date()
          }
        }
      }
    );
  }

  res.json({ message: 'All messages marked as read' });
};
