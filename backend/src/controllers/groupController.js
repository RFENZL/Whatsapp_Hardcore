const Group = require('../models/Group');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');
const { getIO } = require('../socket/io');
const crypto = require('crypto');

// Ensure there's at least one admin in the group. If none, promote a random/member (first) to admin.
async function ensureAdminExists(group) {
  if (!group.admins || group.admins.length === 0) {
    // Prefer creator if still a member
    if (group.creator && group.members.some(m => String(m.user) === String(group.creator))) {
      group.admins = [group.creator];
      const member = group.members.find(m => String(m.user) === String(group.creator));
      if (member) member.role = 'admin';
      return;
    }

    // Otherwise pick the first remaining member
    const firstMember = group.members.length > 0 ? group.members[0].user : null;
    if (firstMember) {
      group.admins = [firstMember];
      const member = group.members.find(m => String(m.user) === String(firstMember));
      if (member) member.role = 'admin';
    }
  }
}

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
    conversation: conversation._id,
    memberHistory: [
      { user: req.user._id, action: 'joined', by: req.user._id },
      ...memberIds.map(id => ({ user: id, action: 'joined', by: req.user._id }))
    ]
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
  // Ensure there's at least one admin in the group
  await ensureAdminExists(group);

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
      if (!conversation.participants.some(p => String(p._id || p) === String(memberId))) {
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
      conversation.participants.forEach(participant => {
        const pid = participant && participant._id ? String(participant._id) : String(participant);
        io.to(pid).emit('group:member-added', {
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
      conversation.participants.forEach(participant => {
        const pid = participant && participant._id ? String(participant._id) : String(participant);
        io.to(pid).emit('group:member-removed', {
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
    conversation.participants.forEach(participant => {
      const pid = participant && participant._id ? String(participant._id) : String(participant);
      io.to(pid).emit('group:member-left', {
        groupId: group._id,
        memberId: req.user._id
      });
    });
  }

  // Ensure at least one admin remains after leaving
  await ensureAdminExists(group);

  await group.save();

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

// Générer un lien d'invitation pour le groupe
exports.generateInviteLink = async (req, res) => {
  const { maxUses, expiresInDays } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent générer des liens
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can generate invite links' });
  }

  // Générer un code unique
  const code = crypto.randomBytes(16).toString('hex');
  
  group.inviteLink = {
    code,
    enabled: true,
    createdAt: new Date(),
    createdBy: req.user._id,
    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null,
    maxUses: maxUses || null,
    uses: 0
  };

  await group.save();

  res.json({
    inviteLink: `/groups/join/${code}`,
    code,
    expiresAt: group.inviteLink.expiresAt,
    maxUses: group.inviteLink.maxUses
  });
};

// Rejoindre un groupe via lien d'invitation
exports.joinViaInvite = async (req, res) => {
  const { code } = req.params;
  const group = await Group.findOne({ 'inviteLink.code': code });

  if (!group) return res.status(404).json({ error: 'Invalid invite link' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Vérifier que le lien est actif
  if (!group.inviteLink.enabled) {
    return res.status(400).json({ error: 'Invite link is disabled' });
  }

  // Vérifier l'expiration
  if (group.inviteLink.expiresAt && group.inviteLink.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invite link has expired' });
  }

  // Vérifier le nombre max d'utilisations
  if (group.inviteLink.maxUses && group.inviteLink.uses >= group.inviteLink.maxUses) {
    return res.status(400).json({ error: 'Invite link has reached maximum uses' });
  }

  // Vérifier que l'utilisateur n'est pas déjà membre
  if (group.members.some(m => String(m.user) === String(req.user._id))) {
    return res.status(400).json({ error: 'You are already a member of this group' });
  }

  // Vérifier que l'utilisateur n'est pas banni
  if (group.bannedMembers && group.bannedMembers.some(b => String(b.user) === String(req.user._id))) {
    return res.status(403).json({ error: 'You are banned from this group' });
  }

  // Ajouter le membre
  group.members.push({ user: req.user._id, role: 'member' });
  group.memberHistory.push({ user: req.user._id, action: 'joined', by: req.user._id });
  group.inviteLink.uses += 1;

  // Mettre à jour la conversation
  const conversation = await Conversation.findById(group.conversation);
  if (conversation && !conversation.participants.includes(req.user._id)) {
    conversation.participants.push(req.user._id);
    await conversation.save();
  }

  await group.save();

  // Message système
  await Message.create({
    sender: req.user._id,
    conversation: group.conversation,
    group: group._id,
    content: `${req.user.username} a rejoint le groupe via un lien d'invitation`,
    type: 'system'
  });

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    group.members.forEach(member => {
      io.to(String(member.user)).emit('group:member-joined', {
        groupId: group._id,
        userId: req.user._id,
        username: req.user.username
      });
    });
  }

  res.json({ message: 'Joined group successfully', group });
};

// Désactiver le lien d'invitation
exports.disableInviteLink = async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent désactiver le lien
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can disable invite links' });
  }

  if (group.inviteLink) {
    group.inviteLink.enabled = false;
  }

  await group.save();

  res.json({ message: 'Invite link disabled' });
};

// Bannir un membre du groupe
exports.banMember = async (req, res) => {
  const { userId, reason } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent bannir
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can ban members' });
  }

  // Ne peut pas bannir un admin
  if (group.isAdmin(userId)) {
    return res.status(400).json({ error: 'Cannot ban an admin' });
  }

  // Vérifier que l'utilisateur est membre
  const memberIndex = group.members.findIndex(m => String(m.user) === String(userId));
  if (memberIndex === -1) {
    return res.status(400).json({ error: 'User is not a member' });
  }

  // Retirer le membre
  group.members.splice(memberIndex, 1);

  // Ajouter à la liste des bannis
  if (!group.bannedMembers) {
    group.bannedMembers = [];
  }
  group.bannedMembers.push({
    user: userId,
    bannedBy: req.user._id,
    reason: reason || ''
  });

  // Ajouter à l'historique
  group.memberHistory.push({
    user: userId,
    action: 'banned',
    by: req.user._id
  });

  // Mettre à jour la conversation
  const conversation = await Conversation.findById(group.conversation);
  if (conversation) {
    conversation.participants = conversation.participants.filter(
      p => String(p) !== String(userId)
    );
    await conversation.save();
  }

  await group.save();

  // Message système
  const user = await User.findById(userId);
  await Message.create({
    sender: req.user._id,
    conversation: group.conversation,
    group: group._id,
    content: `${user ? user.username : 'Un membre'} a été banni du groupe`,
    type: 'system'
  });

  // Notifier via Socket.IO
  const io = getIO();
  if (io) {
    io.to(String(userId)).emit('group:banned', { groupId: group._id });
    group.members.forEach(member => {
      io.to(String(member.user)).emit('group:member-banned', {
        groupId: group._id,
        userId
      });
    });
  }

  res.json({ message: 'Member banned successfully' });
};

// Débannir un membre
exports.unbanMember = async (req, res) => {
  const { userId } = req.body;
  const group = await Group.findById(req.params.id);

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent débannir
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can unban members' });
  }

  // Retirer de la liste des bannis
  if (group.bannedMembers) {
    group.bannedMembers = group.bannedMembers.filter(
      b => String(b.user) !== String(userId)
    );
  }

  await group.save();

  res.json({ message: 'Member unbanned successfully' });
};

// Obtenir l'historique des membres
exports.getMemberHistory = async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('memberHistory.user', 'username avatar')
    .populate('memberHistory.by', 'username');

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Vérifier que l'utilisateur est membre ou admin
  if (!group.isMember(req.user._id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    history: group.memberHistory.sort((a, b) => b.timestamp - a.timestamp)
  });
};

// Obtenir la liste des membres bannis
exports.getBannedMembers = async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('bannedMembers.user', 'username avatar')
    .populate('bannedMembers.bannedBy', 'username');

  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isActive) return res.status(404).json({ error: 'Group not found' });

  // Seuls les admins peuvent voir la liste des bannis
  if (!group.isAdmin(req.user._id)) {
    return res.status(403).json({ error: 'Only admins can view banned members' });
  }

  res.json({ bannedMembers: group.bannedMembers || [] });
};
