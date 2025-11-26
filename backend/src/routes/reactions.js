const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/reactionController');

// Ajouter/Supprimer/Modifier une réaction (toggle)
router.post('/messages/:messageId', auth, ctrl.toggle);

// Obtenir toutes les réactions d'un message
router.get('/messages/:messageId', auth, ctrl.listByMessage);

// Obtenir les réactions d'un utilisateur dans une conversation
router.get('/conversations/:conversationId/user', auth, ctrl.listByUser);

// Supprimer une réaction spécifique
router.delete('/:reactionId', auth, ctrl.remove);

module.exports = router;
