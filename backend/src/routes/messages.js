const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/messageController');

// Créer un message
router.post('/', auth, ctrl.create);

// Recherche de messages
router.get('/search', auth, ctrl.search);

// Liste des conversations (deprecated - utiliser /api/conversations)
router.get('/conversations', auth, ctrl.conversations);

// Obtenir les messages d'une conversation
router.get('/conversation/:conversationId', auth, ctrl.getByConversation);

// Transférer un message
router.post('/:messageId/forward', auth, ctrl.forward);

// Marquer comme livré
router.post('/delivered', auth, ctrl.markDelivered);

// Obtenir les messages avec un utilisateur (deprecated - utiliser conversation)
router.get('/:user_id', auth, ctrl.getWithUser);

// Mettre à jour un message
router.put('/:id', auth, ctrl.update);

// Supprimer un message
router.delete('/:id', auth, ctrl.remove);

// Marquer comme lu
router.post('/:id/read', auth, ctrl.markRead);

module.exports = router;
