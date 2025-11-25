const Contact = require('../models/Contact');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { alertContactAdded, alertContactBlocked, alertContactUnblocked } = require('../utils/securityAlerts');
const logger = require('../utils/logger');

// GET /api/contacts
exports.list = async (req, res) => {
  const items = await Contact.find({ owner: req.user._id })
    .populate('contact', 'username avatar status lastSeen')
    .sort({ isFavorite: -1, 'contact.username': 1 }); // Favoris en premier

  res.json(items.map(c => ({
    _id: c._id,
    blocked: c.blocked,
    isFavorite: c.isFavorite,
    notes: c.notes,
    contact: {
      _id: c.contact._id,
      username: c.contact.username,
      avatar: c.contact.avatar,
      status: c.contact.status,
      lastSeen: c.contact.lastSeen
    }
  })));
};

// POST /api/contacts { contact_id }
exports.add = async (req, res) => {
  const { contact_id } = req.body;
  if (!contact_id) return res.status(400).json({ error: 'contact_id required' });
  if (String(contact_id) === String(req.user._id)) {
    return res.status(400).json({ error: 'cannot add yourself as contact' });
  }

  const user = await User.findById(contact_id);
  if (!user) return res.status(404).json({ error: 'user not found' });

  // Créer le contact pour l'utilisateur A -> B
  const contact = await Contact.findOneAndUpdate(
    { owner: req.user._id, contact: user._id },
    { $setOnInsert: { blocked: false } },
    { new: true, upsert: true }
  ).populate('contact', 'username avatar status lastSeen');

  // Créer automatiquement le contact inverse pour B -> A (bidirectionnel)
  await Contact.findOneAndUpdate(
    { owner: user._id, contact: req.user._id },
    { $setOnInsert: { blocked: false } },
    { new: true, upsert: true }
  );
  
  // Envoyer l'alerte d'ajout de contact
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  alertContactAdded({ 
    user: req.user, 
    contact: { _id: contact.contact._id, username: contact.contact.username },
    ipAddress 
  }).catch(err => {
    logger.error('Failed to send contact added alert', { error: err.message });
  });
  
  logger.logUserAction('contact_added', {
    userId: req.user._id,
    contactId: contact.contact._id,
    contactUsername: contact.contact.username,
    ipAddress,
  });

  res.status(201).json({
    _id: contact._id,
    blocked: contact.blocked,
    contact: {
      _id: contact.contact._id,
      username: contact.contact.username,
      avatar: contact.contact.avatar,
      status: contact.contact.status,
      lastSeen: contact.contact.lastSeen
    }
  });
};

// DELETE /api/contacts/:contactId
exports.remove = async (req, res) => {
  const { contactId } = req.params;
  const removed = await Contact.findOneAndDelete({
    owner: req.user._id,
    contact: contactId
  });
  if (!removed) return res.status(404).json({ error: 'contact not found' });

  // Supprimer aussi le contact inverse (bidirectionnel)
  await Contact.findOneAndDelete({
    owner: contactId,
    contact: req.user._id
  });

  // Supprimer la conversation directe entre les deux utilisateurs
  const conversation = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [req.user._id, contactId] }
  });
  
  if (conversation) {
    // Supprimer tous les messages de la conversation
    await Message.deleteMany({ conversation: conversation._id });
    // Supprimer la conversation
    await Conversation.findByIdAndDelete(conversation._id);
  }

  res.json({ message: 'ok' });
};

// POST /api/contacts/:contactId/block
exports.block = async (req, res) => {
  const { contactId } = req.params;
  const contact = await Contact.findOneAndUpdate(
    { owner: req.user._id, contact: contactId },
    { blocked: true },
    { new: true }
  ).populate('contact', 'username avatar status lastSeen');
  if (!contact) return res.status(404).json({ error: 'contact not found' });

  // Supprimer la conversation directe entre les deux utilisateurs
  const conversation = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [req.user._id, contactId] }
  });
  
  if (conversation) {
    // Supprimer tous les messages de la conversation
    await Message.deleteMany({ conversation: conversation._id });
    // Supprimer la conversation
    await Conversation.findByIdAndDelete(conversation._id);
  }
  
  // Envoyer l'alerte de blocage de contact
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  alertContactBlocked({
    user: req.user,
    blockedUser: { _id: contact.contact._id, username: contact.contact.username },
    ipAddress,
  }).catch(err => {
    logger.error('Failed to send contact blocked alert', { error: err.message });
  });
  
  logger.logUserAction('contact_blocked', {
    userId: req.user._id,
    blockedUserId: contact.contact._id,
    blockedUsername: contact.contact.username,
    ipAddress,
  });

  res.json(contact);
};

// POST /api/contacts/:contactId/unblock
exports.unblock = async (req, res) => {
  const { contactId } = req.params;
  const contact = await Contact.findOneAndUpdate(
    { owner: req.user._id, contact: contactId },
    { blocked: false },
    { new: true }
  ).populate('contact', 'username avatar status lastSeen');
  if (!contact) return res.status(404).json({ error: 'contact not found' });
  
  // Envoyer l'alerte de déblocage de contact
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  alertContactUnblocked({
    user: req.user,
    unblockedUser: { _id: contact.contact._id, username: contact.contact.username },
    ipAddress,
  }).catch(err => {
    logger.error('Failed to send contact unblocked alert', { error: err.message });
  });
  
  logger.logUserAction('contact_unblocked', {
    userId: req.user._id,
    unblockedUserId: contact.contact._id,
    unblockedUsername: contact.contact.username,
    ipAddress,
  });
  
  res.json(contact);
};

// POST /api/contacts/:contactId/favorite (toggle)
exports.toggleFavorite = async (req, res) => {
  const { contactId } = req.params;
  const contact = await Contact.findOne({ owner: req.user._id, contact: contactId });
  if (!contact) return res.status(404).json({ error: 'contact not found' });
  
  contact.isFavorite = !contact.isFavorite;
  await contact.save();
  
  await contact.populate('contact', 'username avatar status lastSeen');
  res.json({
    _id: contact._id,
    blocked: contact.blocked,
    isFavorite: contact.isFavorite,
    notes: contact.notes,
    contact: contact.contact
  });
};

// PUT /api/contacts/:contactId/notes
exports.updateNotes = async (req, res) => {
  const { contactId } = req.params;
  const { notes } = req.body;
  
  if (notes && notes.length > 1000) {
    return res.status(400).json({ error: 'Notes trop longues (max 1000 caractères)' });
  }
  
  const contact = await Contact.findOneAndUpdate(
    { owner: req.user._id, contact: contactId },
    { notes: notes || '' },
    { new: true }
  ).populate('contact', 'username avatar status lastSeen');
  
  if (!contact) return res.status(404).json({ error: 'contact not found' });
  
  res.json({
    _id: contact._id,
    blocked: contact.blocked,
    isFavorite: contact.isFavorite,
    notes: contact.notes,
    contact: contact.contact
  });
};
