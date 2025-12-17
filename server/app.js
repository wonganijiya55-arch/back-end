require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { corsOptions } = require('./cors');
const errorHandler = require('./errors');

function createApp() {
  const app = express();

  // CORS with credentials + preflight
  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));
  app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });

  // Parsers
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Health endpoint
  app.get('/health', (req, res) => res.status(200).json({ ok: true }));
  app.get('/', (req, res) => res.send('Backend is running'));
  app.get('/api/health', (req, res) => res.status(200).json({ ok: true }));
  app.get('/api/status', (req, res) => res.status(200).json({ ok: true, time: new Date().toISOString() }));

  // CORS debug endpoint
  app.get('/api/cors-test', (req, res) => {
    res.json({ 
      ok: true, 
      message: 'CORS is working!',
      yourOrigin: req.headers.origin || 'no origin header',
      time: new Date().toISOString()
    });
  });

  // Routes
  app.use('/api/login', require('../routes/login'));
  app.use('/api/password-reset', require('../routes/passwordResetOTP'));
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/students', require('../routes/students'));
  app.use('/api/admins', require('../routes/admin'));
  app.use('/api/events', require('../routes/events'));
  app.use('/api/payments', require('../routes/payments'));

  // Errors
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
