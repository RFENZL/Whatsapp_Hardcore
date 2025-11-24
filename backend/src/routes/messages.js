const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/messageController');

router.post('/', auth, ctrl.create);
router.get('/conversations', auth, ctrl.conversations);
router.get('/:user_id', auth, ctrl.getWithUser);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);
router.post('/:id/read', auth, ctrl.markRead);

module.exports = router;
