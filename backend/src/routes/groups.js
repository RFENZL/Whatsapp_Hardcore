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

// Générer un lien d'invitation
router.post('/:id/invite', auth, ctrl.generateInviteLink);

// Rejoindre via lien d'invitation
router.post('/join/:code', auth, ctrl.joinViaInvite);

// Désactiver le lien d'invitation
router.delete('/:id/invite', auth, ctrl.disableInviteLink);

// Bannir un membre
router.post('/:id/ban', auth, ctrl.banMember);

// Débannir un membre
router.post('/:id/unban', auth, ctrl.unbanMember);

// Obtenir l'historique des membres
router.get('/:id/history', auth, ctrl.getMemberHistory);

// Obtenir la liste des membres bannis
router.get('/:id/banned', auth, ctrl.getBannedMembers);

module.exports = router;
