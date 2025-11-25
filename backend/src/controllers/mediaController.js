const Media = require('../models/Media');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const logger = require('../utils/logger');

// Types de fichiers autorisés
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
             'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
             'text/plain', 'application/zip', 'application/x-rar-compressed']
};

// Tailles maximales (en octets)
const MAX_SIZES = {
  image: 10 * 1024 * 1024,    // 10 MB
  video: 100 * 1024 * 1024,   // 100 MB
  audio: 20 * 1024 * 1024,    // 20 MB
  document: 50 * 1024 * 1024  // 50 MB
};

// Déterminer le type de média
function getMediaType(mimeType) {
  for (const [type, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type;
    }
  }
  return 'other';
}

// Valider le fichier
function validateFile(file, mediaType) {
  const errors = [];

  // Vérifier le type MIME
  const allowedMimes = ALLOWED_TYPES[mediaType] || [];
  if (mediaType !== 'other' && !allowedMimes.includes(file.mimetype)) {
    errors.push(`Type de fichier non autorisé pour ${mediaType}`);
  }

  // Vérifier la taille
  const maxSize = MAX_SIZES[mediaType] || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`Fichier trop volumineux (max ${maxSize / (1024 * 1024)}MB)`);
  }

  return errors;
}

// Calculer le hash d'un fichier
async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Compresser une image avec sharp
async function compressImage(inputPath, outputPath, quality = 80) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Compression basée sur le format
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      await image.jpeg({ quality }).toFile(outputPath);
    } else if (metadata.format === 'png') {
      await image.png({ quality, compressionLevel: 9 }).toFile(outputPath);
    } else if (metadata.format === 'webp') {
      await image.webp({ quality }).toFile(outputPath);
    } else {
      // Convertir en JPEG par défaut
      await image.jpeg({ quality }).toFile(outputPath);
    }
    
    return metadata;
  } catch (error) {
    console.error('Erreur compression image:', error);
    throw error;
  }
}

// Générer une miniature
async function generateThumbnail(inputPath, outputPath, width = 200, height = 200) {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error('Erreur génération miniature:', error);
    return false;
  }
}

// Upload d'un fichier
exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const mediaType = getMediaType(file.mimetype);

    // Validation
    const validationErrors = validateFile(file, mediaType);
    if (validationErrors.length > 0) {
      // Supprimer le fichier uploadé
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ errors: validationErrors });
    }

    // Calculer le hash
    const hash = await calculateFileHash(file.path);

    // Vérifier si le fichier existe déjà (déduplication)
    const existingMedia = await Media.findOne({
      hash,
      uploadedBy: req.user._id,
      status: { $ne: 'deleted' }
    });

    if (existingMedia) {
      // Supprimer le nouveau fichier et retourner l'existant
      await fs.unlink(file.path).catch(() => {});
      return res.json(existingMedia);
    }

    let finalPath = file.path;
    let dimensions = null;
    let thumbnailPath = null;

    // Traitement spécifique pour les images
    if (mediaType === 'image') {
      try {
        const compressedFilename = `compressed_${file.filename}`;
        const compressedPath = path.join(path.dirname(file.path), compressedFilename);
        
        // Compresser l'image
        const metadata = await compressImage(file.path, compressedPath, 85);
        dimensions = {
          width: metadata.width,
          height: metadata.height
        };
        
        // Supprimer l'original et utiliser la version compressée
        await fs.unlink(file.path).catch(() => {});
        await fs.rename(compressedPath, file.path);
        
        // Générer une miniature
        const thumbnailFilename = `thumb_${file.filename}`;
        thumbnailPath = path.join(path.dirname(file.path), thumbnailFilename);
        await generateThumbnail(file.path, thumbnailPath);
        
      } catch (error) {
        console.error('Erreur traitement image:', error);
        // Continuer avec le fichier original si le traitement échoue
      }
    }

    // Créer l'entrée dans la base de données
    const mediaData = {
      uploadedBy: req.user._id,
      type: mediaType,
      originalName: file.originalname,
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      hash,
      status: 'ready'
    };

    // Ajouter les dimensions si disponibles
    if (dimensions) {
      mediaData.dimensions = dimensions;
    }

    // Ajouter la miniature si générée
    if (thumbnailPath) {
      const thumbnailFilename = path.basename(thumbnailPath);
      mediaData.thumbnail = `/uploads/${thumbnailFilename}`;
    }

    // Ajouter conversation si fournie
    if (req.body.conversation_id) {
      mediaData.conversation = req.body.conversation_id;
    }

    const media = await Media.create(mediaData);

    res.status(201).json(media);
  } catch (error) {
    logger.error('Upload error', { error: error.message, stack: error.stack, userId: req.user?._id });
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Lister les médias d'une conversation
exports.listByConversation = async (req, res) => {
  const { conversationId } = req.params;
  const { type, page = 1, limit = 20 } = req.query;

  const query = {
    conversation: conversationId,
    status: { $ne: 'deleted' }
  };

  if (type) {
    query.type = type;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [items, total] = await Promise.all([
    Media.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'username avatar'),
    Media.countDocuments(query)
  ]);

  res.json({
    items,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit))
  });
};

// Obtenir un média par ID
exports.getById = async (req, res) => {
  const media = await Media.findById(req.params.id)
    .populate('uploadedBy', 'username avatar')
    .populate('conversation');

  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }

  if (media.status === 'deleted') {
    return res.status(404).json({ error: 'Media not found' });
  }

  // Vérifier l'accès (si associé à une conversation)
  if (media.conversation) {
    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findById(media.conversation);
    
    if (!conversation || !conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } else if (String(media.uploadedBy._id) !== String(req.user._id)) {
    // Si pas de conversation, vérifier que c'est l'uploader
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(media);
};

// Supprimer un média
exports.remove = async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }

  // Seul l'uploader peut supprimer
  if (String(media.uploadedBy) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the uploader can delete this media' });
  }

  // Soft delete
  await media.softDelete();

  // Optionnel : supprimer le fichier physique (décommenter si nécessaire)
  /*
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const filePath = path.join(uploadsDir, media.filename);
  await fs.unlink(filePath).catch(() => {});
  */

  res.json({ message: 'Media deleted successfully' });
};

// Statistiques des médias d'un utilisateur
exports.stats = async (req, res) => {
  const userId = req.user._id;

  const stats = await Media.aggregate([
    {
      $match: {
        uploadedBy: userId,
        status: { $ne: 'deleted' }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    }
  ]);

  const result = {
    byType: stats.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        totalSize: item.totalSize,
        totalSizeMB: (item.totalSize / (1024 * 1024)).toFixed(2)
      };
      return acc;
    }, {}),
    total: {
      count: stats.reduce((sum, item) => sum + item.count, 0),
      size: stats.reduce((sum, item) => sum + item.totalSize, 0)
    }
  };

  result.total.sizeMB = (result.total.size / (1024 * 1024)).toFixed(2);

  res.json(result);
};

// Streaming d'un fichier (pour gros fichiers, vidéos, etc.)
exports.stream = async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }

  if (media.status === 'deleted') {
    return res.status(404).json({ error: 'Media not found' });
  }

  // Vérifier l'accès
  if (media.conversation) {
    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findById(media.conversation);
    
    if (!conversation || !conversation.participants.some(p => String(p._id || p) === String(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } else if (String(media.uploadedBy) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const filePath = path.join(uploadsDir, media.filename);

  try {
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Support du range pour streaming progressif
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': media.mimeType
      });

      const readStream = require('fs').createReadStream(filePath, { start, end });
      readStream.pipe(res);
    } else {
      // Streaming complet
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': media.mimeType
      });

      const readStream = require('fs').createReadStream(filePath);
      readStream.pipe(res);
    }
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
};
