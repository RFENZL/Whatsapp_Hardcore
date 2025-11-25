const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Types MIME autorisés
const ALLOWED_MIMES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Vidéos
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  // Documents
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed'
];

// Configure multer storage to preserve file extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtre de validation
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo
  },
  fileFilter: fileFilter
});

// POST /api/upload (form-data: file)
router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });

  const file = req.file;
  const publicPath = `/uploads/${file.filename}`;

  res.status(201).json({
    url: publicPath,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype
  });
});

// Gestion des erreurs multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Fichier trop volumineux (max 10MB)' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
