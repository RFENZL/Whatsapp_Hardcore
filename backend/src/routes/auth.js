const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.validateRegister, ctrl.register);
router.post('/login', ctrl.validateLogin, ctrl.login);
router.post('/logout', auth, ctrl.logout);
router.post('/refresh', ctrl.refresh);
router.get('/verify-email', ctrl.verifyEmail);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.get('/me', auth, ctrl.me);

module.exports = router;
