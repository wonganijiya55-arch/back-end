const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await pool.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS reg_number TEXT UNIQUE");
    await pool.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS year INTEGER");
    await pool.query(`CREATE TABLE IF NOT EXISTS admin_codes (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      attempts_left INTEGER NOT NULL DEFAULT 5,
      used_at TIMESTAMP
    )`);
    console.log('Migration complete: admins(reg_number, year) ensured; admin_codes ensured.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
