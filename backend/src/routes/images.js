const router = require('express').Router();
const ctrl = require('../controllers/imagesController');

// Liste toutes les images disponibles
router.get('/', ctrl.listImages);

module.exports = router;
