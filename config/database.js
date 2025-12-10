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

// Lightweight connectivity check run at startup
async function testConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log(`Database connected. Server time: ${rows[0].now.toISOString ? rows[0].now.toISOString() : rows[0].now}`);
  } catch (err) {
    console.error('Failed to connect to the database via pg Pool.');
    console.error('Error code:', err.code || 'N/A');
    console.error('Message:', err.message);
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
      admin_code TEXT UNIQUE
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
