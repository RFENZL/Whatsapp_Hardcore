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

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo
  }
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

module.exports = router;
