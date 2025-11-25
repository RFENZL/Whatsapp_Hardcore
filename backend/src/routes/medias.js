const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/mediaController');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Configuration du stockage
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max
  }
});

// Upload un média
router.post('/', auth, upload.single('file'), ctrl.upload);

// Lister les médias d'une conversation
router.get('/conversation/:conversationId', auth, ctrl.listByConversation);

// Statistiques des médias
router.get('/stats', auth, ctrl.stats);

// Streaming d'un média
router.get('/:id/stream', auth, ctrl.stream);

// Obtenir un média
router.get('/:id', auth, ctrl.getById);

// Supprimer un média
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
