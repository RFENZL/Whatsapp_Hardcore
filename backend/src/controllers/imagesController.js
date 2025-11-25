const fs = require('fs');
const path = require('path');

exports.listImages = async (req, res) => {
  try {
    const imagesDir = path.join(__dirname, '../../../frontend/public/images');
    const files = fs.readdirSync(imagesDir);
    
    // Filtrer pour ne garder que les images
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.gif', '.webp'];
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => `/images/${file}`);
    
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list images' });
  }
};
