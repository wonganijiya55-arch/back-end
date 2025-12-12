// Load env vars BEFORE any DB imports (critical for DB URL)
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const loginRoute = require("./routes/login");
const passwordResetOTPRoutes = require("./routes/passwordResetOTP");
const { init } = require('./models/init');

// CORS configuration per requested prompt
const allowedOrigins = ['https://wonganijiya55-arch.github.io'];
const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser tools
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
};
app.use(cors(corsOptions));
// Preflight handling for all routes
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

// Health routes (near top, before mounting API routes)
app.get('/', (req, res) => res.send('Backend is running'));
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

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
