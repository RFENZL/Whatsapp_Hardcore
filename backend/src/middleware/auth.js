const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  // Essayer d'abord le cookie, puis le header Authorization (pour compatibilité)
  let token = req.cookies?.token;
  
  if (!token) {
    const authHeader = req.headers['authorization'] || '';
    token = authHeader.split(' ')[1];
  }
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
