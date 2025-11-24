const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.validateRegister, ctrl.register);
router.post('/login', ctrl.validateLogin, ctrl.login);
router.post('/logout', auth, ctrl.logout);

module.exports = router;
