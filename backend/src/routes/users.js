const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.get('/search', auth, ctrl.search);
router.get('/sessions', auth, ctrl.getSessions);
router.delete('/sessions/:sessionId', auth, ctrl.deleteSession);
router.get('/:id', auth, ctrl.getById);
router.get('/', auth, ctrl.list);
router.put('/profile', auth, ctrl.updateProfile);
router.delete('/account', auth, ctrl.deleteAccount);

module.exports = router;
