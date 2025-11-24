const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/contactController');

router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.add);
router.delete('/:contactId', auth, ctrl.remove);
router.post('/:contactId/block', auth, ctrl.block);
router.post('/:contactId/unblock', auth, ctrl.unblock);

module.exports = router;
