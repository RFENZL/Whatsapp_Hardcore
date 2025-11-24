const Group = require('../models/Group');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');
const { getIO } = require('../socket/io');

// Créer un groupe
exports.create = async (req, res) => {
  const { name, description, avatar, memberIds } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Group name required' });
  }

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'At least one member required' });
  }

  // Vérifier que tous les membres existent
  const members = await User.find({ _id: { $in: memberIds } });
  if (members.length !== memberIds.length) {
    return res.status(400).json({ error: 'Some members not found' });
  }

  // Créer la conversation de groupe
  const conversation = await Conversation.create({
    type: 'group',
    participants: [req.user._id, ...memberIds]
  });

  // Créer le groupe
  const group = await Group.create({
    name: name.trim(),
    description: description || '',
    avatar: avatar || '',
    creator: req.user._id,
    admins: [req.user._id],
    members: [
      { user: req.user._id, role: 'admin' },
      ...memberIds.map(id => ({ user: id, role: 'member' }))
    ],
    conversation: conversation._id
  });

  // Lier la conversation au groupe
  conversation.group = group._id;
  await conversation.save();

  // Créer un message système
  await Message.create({
    sender: req.user._id,
    conversation: conversation._id,
    group: group._id,
    content: `${req.user.username} a créé le groupe`,
    type: 'system'
  });

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    [...memberIds, req.user._id].forEach(memberId => {
      io.to(String(memberId)).emit('group:created', {
        groupId: group._id,
        conversationId: conversation._id,
        name: group.name
      });
    });
  }

  const populatedGroup = await Group.findById(group._id)
    .populate('members.user', 'username avatar status')
    .populate('admins', 'username avatar')
    .populate('creator', 'username avatar');

  res.status(201).json(populatedGroup);
};

// Obtenir les informations d'un groupe
exports.getById = async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('members.user', 'username avatar status lastSeen')
    .populate('admins', 'username avatar')
    .populate('creator', 'username avatar');

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Vérifier que l'utilisateur est membre
  if (!group.isMember(req.user._id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(group);
};

// Mettre à jour les informations du groupe
exports.update = async (req, res) => {
  const { name, description, avatar } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Vérifier les permissions
  const canEdit = group.settings.whoCanEditInfo === 'all' 
    ? group.isMember(req.user._id)
    : group.isAdmin(req.user._id);

  if (!canEdit) {
    return res.status(403).json({ error: 'You do not have permission to edit group info' });
  }

  if (name !== undefined) group.name = name.trim();
  if (description !== undefined) group.description = description;
  if (avatar !== undefined) group.avatar = avatar;

  await group.save();

  // Notifier les membres
  const io = getIO();
  if (io) {
    const conversation = await Conversation.findOne({ group: group._id });
    if (conversation) {
      conversation.participants.forEach(memberId => {
        io.to(String(memberId)).emit('group:updated', {
          groupId: group._id,
          name: group.name,
          description: group.description,
          avatar: group.avatar
        });
      });
    }
  }

  res.json(group);
};

// Ajouter des membres au groupe
exports.addMembers = async (req, res) => {
  const { memberIds } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Vérifier les permissions
  const canAdd = group.settings.whoCanAddMembers === 'all'
    ? group.isMember(req.user._id)
    : group.isAdmin(req.user._id);

  if (!canAdd) {
    return res.status(403).json({ error: 'You do not have permission to add members' });
  }

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'Member IDs required' });
  }

  // Vérifier que les utilisateurs existent
  const users = await User.find({ _id: { $in: memberIds } });
  if (users.length !== memberIds.length) {
    return res.status(400).json({ error: 'Some users not found' });
  }

  // Ajouter les nouveaux membres
  const newMembers = [];
  for (const userId of memberIds) {
    if (!group.isMember(userId)) {
      group.members.push({ user: userId, role: 'member' });
      newMembers.push(userId);
    }
  }

  // Mettre à jour la conversation
  const conversation = await Conversation.findOne({ group: group._id });
  if (conversation) {
    newMembers.forEach(memberId => {
      if (!conversation.participants.includes(memberId)) {
        conversation.participants.push(memberId);
      }
    });
    await conversation.save();
  }

  await group.save();

  // Message système
  if (newMembers.length > 0) {
    const addedUsers = users.filter(u => newMembers.includes(String(u._id)));
    const content = `${req.user.username} a ajouté ${addedUsers.map(u => u.username).join(', ')}`;
    
    await Message.create({
      sender: req.user._id,
      conversation: conversation._id,
      group: group._id,
      content,
      type: 'system'
    });

    // Notifier via Socket.IO
    const io = getIO();
    if (io) {
      conversation.participants.forEach(memberId => {
        io.to(String(memberId)).emit('group:member-added', {
          groupId: group._id,
          newMembers: addedUsers.map(u => ({ _id: u._id, username: u.username, avatar: u.avatar }))
        });
      });
    }
  }

  const updatedGroup = await Group.findById(group._id)
    .populate('members.user', 'username avatar status');

  res.json(updatedGroup);
};

// Supprimer un membre du groupe
exports.removeMember = async (req, res) => {
  const { memberId } = req.params;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent supprimer des membres
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can remove members' });
  }

  // Ne pas supprimer le créateur
  if (String(group.creator) === String(memberId)) {
    return res.status(400).json({ error: 'Cannot remove group creator' });
  }

  // Supprimer le membre
  group.members = group.members.filter(m => String(m.user) !== String(memberId));
  group.admins = group.admins.filter(id => String(id) !== String(memberId));

  // Mettre à jour la conversation
  const conversation = await Conversation.findOne({ group: group._id });
  if (conversation) {
    conversation.participants = conversation.participants.filter(
      id => String(id) !== String(memberId)
    );
    await conversation.save();
  }

  await group.save();

  // Message système
  const removedUser = await User.findById(memberId);
  if (removedUser) {
    await Message.create({
      sender: req.user._id,
      conversation: conversation._id,
      group: group._id,
      content: `${req.user.username} a retiré ${removedUser.username}`,
      type: 'system'
    });
  }

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    io.to(String(memberId)).emit('group:removed', { groupId: group._id });
    
    if (conversation) {
      conversation.participants.forEach(pId => {
        io.to(String(pId)).emit('group:member-removed', {
          groupId: group._id,
          removedMemberId: memberId
        });
      });
    }
  }

  res.json({ message: 'Member removed successfully' });
};

// Quitter le groupe
exports.leave = async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  if (!group.isMember(req.user._id)) {
    return res.status(400).json({ error: 'You are not a member of this group' });
  }

  // Si c'est le créateur, transférer le rôle ou dissoudre le groupe
  if (String(group.creator) === String(req.user._id)) {
    // Trouver un autre admin
    const otherAdmin = group.admins.find(id => String(id) !== String(req.user._id));
    if (otherAdmin) {
      group.creator = otherAdmin;
    } else if (group.members.length > 1) {
      // Promouvoir le premier membre
      const firstMember = group.members.find(m => String(m.user) !== String(req.user._id));
      if (firstMember) {
        group.creator = firstMember.user;
        group.admins.push(firstMember.user);
        firstMember.role = 'admin';
      }
    } else {
      // Dernier membre, désactiver le groupe
      group.isActive = false;
      await group.save();
      return res.json({ message: 'Group deleted as you were the last member' });
    }
  }

  // Retirer l'utilisateur
  group.members = group.members.filter(m => String(m.user) !== String(req.user._id));
  group.admins = group.admins.filter(id => String(id) !== String(req.user._id));

  // Mettre à jour la conversation
  const conversation = await Conversation.findOne({ group: group._id });
  if (conversation) {
    conversation.participants = conversation.participants.filter(
      id => String(id) !== String(req.user._id)
    );
    await conversation.save();
  }

  await group.save();

  // Message système
  await Message.create({
    sender: req.user._id,
    conversation: conversation._id,
    group: group._id,
    content: `${req.user.username} a quitté le groupe`,
    type: 'system'
  });

  // Notifier via Socket.IO
  const io = getIO();
  if (io && conversation) {
    conversation.participants.forEach(memberId => {
      io.to(String(memberId)).emit('group:member-left', {
        groupId: group._id,
        memberId: req.user._id
      });
    });
  }

  res.json({ message: 'You left the group successfully' });
};

// Promouvoir un membre en admin
exports.promoteToAdmin = async (req, res) => {
  const { memberId } = req.params;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent promouvoir
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can promote members' });
  }

  if (!group.isMember(memberId)) {
    return res.status(400).json({ error: 'User is not a member of this group' });
  }

  if (group.isAdmin(memberId)) {
    return res.status(400).json({ error: 'User is already an admin' });
  }

  // Promouvoir
  group.admins.push(memberId);
  const member = group.members.find(m => String(m.user) === String(memberId));
  if (member) member.role = 'admin';

  await group.save();

  // Notifier
  const io = getIO();
  if (io) {
    const conversation = await Conversation.findOne({ group: group._id });
    if (conversation) {
      conversation.participants.forEach(pId => {
        io.to(String(pId)).emit('group:admin-promoted', {
          groupId: group._id,
          memberId
        });
      });
    }
  }

  res.json({ message: 'Member promoted to admin' });
};

// Mettre à jour les paramètres du groupe
exports.updateSettings = async (req, res) => {
  const { whoCanSendMessages, whoCanEditInfo, whoCanAddMembers } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent modifier les paramètres
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can update settings' });
  }

  if (whoCanSendMessages) group.settings.whoCanSendMessages = whoCanSendMessages;
  if (whoCanEditInfo) group.settings.whoCanEditInfo = whoCanEditInfo;
  if (whoCanAddMembers) group.settings.whoCanAddMembers = whoCanAddMembers;

  await group.save();

  res.json(group);
};
