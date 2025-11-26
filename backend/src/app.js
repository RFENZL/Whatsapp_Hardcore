const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const createError = require('http-errors');
const Sentry = require('@sentry/node');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const contactRoutes = require('./routes/contacts');
const uploadRoutes = require('./routes/upload');
const conversationRoutes = require('./routes/conversations');
const groupRoutes = require('./routes/groups');
const mediaRoutes = require('./routes/medias');
const reactionRoutes = require('./routes/reactions');
const notificationRoutes = require('./routes/notifications');
const imagesRoutes = require('./routes/images');

const app = express();

// Sentry monitoring (erreurs + performances)
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 0.1,
  // Activer le profiling des performances
  profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
    ? Number(process.env.SENTRY_PROFILES_SAMPLE_RATE)
    : 0.1,
  // Intégration avec Express
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
  // Capturer les breadcrumbs supplémentaires
  beforeBreadcrumb(breadcrumb, hint) {
    // Enrichir les breadcrumbs
    if (breadcrumb.category === 'http') {
      breadcrumb.data = breadcrumb.data || {};
      breadcrumb.data.environment = process.env.NODE_ENV;
    }
    return breadcrumb;
  },
});

// Request handler avec tracing
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Middleware pour ajouter le context utilisateur à Sentry
app.use((req, res, next) => {
  if (req.user) {
    Sentry.setUser({
      id: req.user._id.toString(),
      username: req.user.username,
      email: req.user.email,
    });
    
    // Ajouter des breadcrumbs personnalisés
    Sentry.addBreadcrumb({
      category: 'user',
      message: `User action: ${req.method} ${req.path}`,
      level: 'info',
      data: {
        userId: req.user._id.toString(),
        username: req.user.username,
        method: req.method,
        path: req.path,
      },
    });
  }
  
  // Ajouter le contexte de la requête
  Sentry.setContext('request', {
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
    },
    ip: req.ip,
  });
  
  next();
});

// Middleware de redirection HTTPS (forcer HTTPS en production)
if (process.env.NODE_ENV === 'production' && process.env.USE_HTTPS !== 'false') {
  app.use((req, res, next) => {
    // Vérifier si la requête utilise HTTPS
    const isHttps = req.secure || 
                    req.headers['x-forwarded-proto'] === 'https' ||
                    req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isHttps) {
      logger.warn('HTTP request redirected to HTTPS', { 
        url: req.url, 
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Rediriger vers HTTPS
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    
    next();
  });
  
  // Ajouter l'en-tête HSTS (HTTP Strict Transport Security)
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });
  
  logger.info('HTTPS enforcement enabled in production');
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting pour les routes d'authentification (désactivé en test)
if (process.env.NODE_ENV !== 'test') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives max
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { 
        ip: req.ip, 
        path: req.path,
        method: req.method 
      });
      res.status(429).json({ error: 'Too many login attempts, please try again later' });
    }
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/medias', mediaRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/images', imagesRoutes);

// Servir les fichiers uploadés avec CORS
const uploadsPath = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middleware CORS spécifique pour les uploads
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use('/uploads', express.static(uploadsPath));

const distPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const indexHtml = path.join(distPath, 'index.html');

if (fs.existsSync(distPath) && fs.existsSync(indexHtml)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/(api|socket\.io)\/).*/, (req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send('Frontend non construit. Exécutez: cd frontend && npm run build');
  });
}

app.use((req, res, next) => {
  next(createError(404, 'Not found'));
});

// Sentry error handler (doit être avant notre handler générique)
app.use(Sentry.Handlers.errorHandler());

app.use((err, req, res, next) => {
  const status = err.status || 500;
  
  // Log l'erreur avec Winston
  if (status >= 500) {
    logger.error(`${err.message}`, {
      error: err.stack,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  } else {
    logger.warn(`${status} - ${err.message}`, {
      method: req.method,
      path: req.path,
    });
  }
  
  res.status(status).json({ error: { message: err.message || 'Error' } });
});

module.exports = app;
