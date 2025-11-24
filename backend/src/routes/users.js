const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.get('/:id', auth, ctrl.getById);
router.get('/', auth, ctrl.list);
router.put('/profile', auth, ctrl.updateProfile);
router.get('/search', auth, ctrl.search);

module.exports = router;
