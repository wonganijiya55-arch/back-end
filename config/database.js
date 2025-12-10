const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

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
      password TEXT NOT NULL
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

  for (const q of queries) {
    await pool.query(q);
  }
}

module.exports = { pool, initTables };
