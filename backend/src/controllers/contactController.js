const Contact = require('../models/Contact');
const User = require('../models/User');

// GET /api/contacts
exports.list = async (req, res) => {
  const items = await Contact.find({ owner: req.user._id })
    .populate('contact', 'username avatar status lastSeen')
    .sort({ 'contact.username': 1 });

  res.json(items.map(c => ({
    _id: c._id,
    blocked: c.blocked,
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

  const contact = await Contact.findOneAndUpdate(
    { owner: req.user._id, contact: user._id },
    { $setOnInsert: { blocked: false } },
    { new: true, upsert: true }
  ).populate('contact', 'username avatar status lastSeen');

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
  res.json(contact);
};
