const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/groupController');

// Créer un groupe
router.post('/', auth, ctrl.create);

// Obtenir un groupe
router.get('/:id', auth, ctrl.getById);

// Mettre à jour un groupe
router.put('/:id', auth, ctrl.update);

// Ajouter des membres
router.post('/:id/members', auth, ctrl.addMembers);

// Supprimer un membre
router.delete('/:id/members/:memberId', auth, ctrl.removeMember);

// Quitter le groupe
router.post('/:id/leave', auth, ctrl.leave);

// Promouvoir en admin
router.post('/:id/members/:memberId/promote', auth, ctrl.promoteToAdmin);

// Mettre à jour les paramètres
router.put('/:id/settings', auth, ctrl.updateSettings);

module.exports = router;
