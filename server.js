// Load env vars BEFORE any DB imports (critical for DB URL)
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const loginRoute = require("./routes/login");
const passwordResetOTPRoutes = require("./routes/passwordResetOTP");
const { init } = require('./models/init');

// CORS configuration - Allow requests from frontend
const allowedOrigins = ['https://wonganijiya55-arch.github.io'];
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, Postman, curl)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin (non-browser tool)');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('[CORS] Allowing request from:', origin);
      return callback(null, true);
    }
    
    // Log and reject disallowed origins
    console.warn('[CORS] Blocked request from disallowed origin:', origin);
    console.warn('[CORS] Allowed origins are:', allowedOrigins.join(', '));
    return callback(
      new Error(`CORS policy: Origin "${origin}" is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`)
    );
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

console.log('\n========================================');
console.log('🚀 Starting Backend Server');
console.log('========================================');

// Debug presence of DB URLs on startup (avoid printing secrets)
console.log('\n📊 Database Configuration Check:');
console.log('   DATABASE_URL (fallback):', process.env.DATABASE_URL ? '✅ [set]' : '❌ [missing]');
console.log('   DATABASE_URL_INTERNAL:', process.env.DATABASE_URL_INTERNAL ? '✅ [set]' : '❌ [missing]');
console.log('   DATABASE_URL_EXTERNAL:', process.env.DATABASE_URL_EXTERNAL ? '✅ [set]' : '❌ [missing]');
console.log('   RENDER environment:', process.env.RENDER ? '✅ Yes' : '❌ No (local)');
console.log('   JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY ? '✅ [set]' : '⚠️  [missing]');

console.log('\n🌐 CORS Configuration:');
console.log('   Allowed origins:', allowedOrigins.join(', '));

// Ensure DB is ready before accepting requests
console.log('\n🔄 Initializing database...');
init().then(() => {
  app.listen(PORT, () => {
    console.log('\n========================================');
    console.log(`✅ Server is running on port ${PORT}`);
    console.log('========================================\n');
  });
}).catch(err => {
  console.error('\n❌ Failed to initialize database');
  console.error('Error:', err.message);
  console.error('\n💡 Troubleshooting tips:');
  console.error('   1. Check that DATABASE_URL is set correctly');
  console.error('   2. Verify database server is running and accessible');
  console.error('   3. Confirm network connectivity to database host');
  console.error('   4. Check database credentials are correct');
  console.error('\n========================================\n');
  process.exit(1);
});
