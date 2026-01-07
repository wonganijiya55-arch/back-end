// PostgreSQL connection via pg Pool with Render-friendly SSL
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Prefer internal URL on Render; use external locally
const isRender = !!process.env.RENDER; // Render sets RENDER=true in its environment
let connectionString;
if (isRender && process.env.DATABASE_URL_INTERNAL) {
  connectionString = process.env.DATABASE_URL_INTERNAL;
} else if (process.env.DATABASE_URL_EXTERNAL) {
  connectionString = process.env.DATABASE_URL_EXTERNAL;
} else {
  connectionString = process.env.DATABASE_URL;
}

if (!connectionString) {
  // Fail fast when DB URL is missing
  throw new Error('DATABASE_URL is not set. Please configure DATABASE_URL_INTERNAL or DATABASE_URL_EXTERNAL or DATABASE_URL in your environment (.env locally, Render env in production).');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Database error code to helpful message mapping
const DB_ERROR_MESSAGES = {
  'ENOTFOUND': 'Database host not found. Check your DATABASE_URL setting.',
  'ECONNREFUSED': 'Connection refused. Database server may be down or unreachable.',
  '28P01': 'Authentication failed. Check database username and password.',
  '3D000': 'Database does not exist. Check database name in connection string.',
  'ETIMEDOUT': 'Connection timeout. Check network connectivity and firewall settings.',
  'ECONNRESET': 'Connection was reset. Database server may have closed the connection.',
};

// Lightweight connectivity check run at startup
async function testConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log('✅ Database connected successfully');
    console.log(`📅 Server time: ${rows[0].now.toISOString ? rows[0].now.toISOString() : rows[0].now}`);
    console.log(`🔗 Connection string used: ${connectionString ? '[set]' : '[missing]'}`);
  } catch (err) {
    console.error('❌ Failed to connect to the database via pg Pool');
    console.error('🔴 Error code:', err.code || 'N/A');
    console.error('🔴 Error name:', err.name || 'N/A');
    console.error('🔴 Error message:', err.message);
    
    // Provide helpful debugging information based on error code
    const helpMessage = DB_ERROR_MESSAGES[err.code];
    if (helpMessage) {
      console.error('💡', helpMessage);
    }
    
    console.error('🔍 Connection details (redacted):');
    console.error('   - DATABASE_URL_INTERNAL:', process.env.DATABASE_URL_INTERNAL ? '[set]' : '[not set]');
    console.error('   - DATABASE_URL_EXTERNAL:', process.env.DATABASE_URL_EXTERNAL ? '[set]' : '[not set]');
    console.error('   - DATABASE_URL:', process.env.DATABASE_URL ? '[set]' : '[not set]');
    console.error('   - RENDER:', process.env.RENDER ? 'true' : 'false');
    
    throw err;
  }
}

// Minimal schema bootstrap for first-run deployments
async function initTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      year TEXT,
      registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      reg_number TEXT UNIQUE,
      year INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATE NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      purpose TEXT NOT NULL,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS event_registrations (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      event_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
    ,
    `CREATE TABLE IF NOT EXISTS admin_codes (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      attempts_left INTEGER NOT NULL DEFAULT 5,
      used_at TIMESTAMP
    )`
    ,
    // Ensure columns exist on previously-created admins tables
    `ALTER TABLE admins ADD COLUMN IF NOT EXISTS reg_number TEXT UNIQUE`,
    `ALTER TABLE admins ADD COLUMN IF NOT EXISTS year INTEGER`
  ];

  try {
    for (const q of queries) {
      await pool.query(q);
    }
    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Error initializing database tables:', err.message);
    throw err;
  }
}

module.exports = { pool, testConnection, initTables };
