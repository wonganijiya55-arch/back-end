// Load env vars BEFORE any DB imports (critical for DB URL)
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const loginRoute = require("./routes/login");
const passwordResetOTPRoutes = require("./routes/passwordResetOTP");
const { init } = require('./models/init');

// CORS with credentials and strict origin whitelist
const allowedOrigins = [
  'https://wonganijiya55-arch.github.io', // GitHub Pages origin (no path)
  'http://127.0.0.1:5501', // local static server
  'http://localhost:5501'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Some clients (like curl) may not send Origin; allow if missing
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error('CORS: Origin not allowed');
    err.status = 403;
    callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
// Ensure caches vary by Origin (good for proxies/CDNs)
app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });
// Respond to preflight for all routes
// Express 5 path-to-regexp: avoid '*' wildcard; use regex instead
app.options(/.*/, cors(corsOptions));

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routes (ensure each require resolves to an Express router)
app.use("/api/login", loginRoute);
app.use("/api/password-reset", passwordResetOTPRoutes);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/admins', require('./routes/admin')); // file is admin.js (singular)
app.use('/api/events', require('./routes/events'));
app.use('/api/payments', require('./routes/payments'));

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

//start server
const PORT = process.env.PORT || 5000;
// Debug presence of DB URLs on startup (avoid printing secrets)
console.log('DATABASE_URL (fallback):', process.env.DATABASE_URL ? '[set]' : '[missing]');
console.log('DATABASE_URL_INTERNAL:', process.env.DATABASE_URL_INTERNAL ? '[set]' : '[missing]');
console.log('DATABASE_URL_EXTERNAL:', process.env.DATABASE_URL_EXTERNAL ? '[set]' : '[missing]');
// Ensure DB is ready before accepting requests
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database tables', err);
  process.exit(1);
});
