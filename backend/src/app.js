const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const createError = require('http-errors');
const Sentry = require('@sentry/node');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

const app = express();

// Sentry monitoring (erreurs + performances)
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 0.1,
});

app.use(Sentry.Handlers.requestHandler());

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

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
  res.status(status).json({ error: { message: err.message || 'Error' } });
});

module.exports = app;
