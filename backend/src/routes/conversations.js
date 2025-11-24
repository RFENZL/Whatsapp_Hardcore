const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/conversationController');

// Créer une conversation directe
router.post('/direct', auth, ctrl.createDirect);

// Lister les conversations de l'utilisateur
router.get('/', auth, ctrl.list);

// Obtenir une conversation par ID
router.get('/:id', auth, ctrl.getById);

// Archiver une conversation
router.post('/:id/archive', auth, ctrl.archive);

// Désarchiver une conversation
router.post('/:id/unarchive', auth, ctrl.unarchive);

// Muet/Démuet une conversation
router.post('/:id/toggle-mute', auth, ctrl.toggleMute);

// Supprimer une conversation
router.delete('/:id', auth, ctrl.remove);

// Marquer tous les messages comme lus
router.post('/:id/mark-read', auth, ctrl.markAllRead);

module.exports = router;
