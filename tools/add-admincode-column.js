const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await pool.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS admin_code VARCHAR(255)");
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'admins_admin_code_key'
        ) THEN
          ALTER TABLE admins ADD CONSTRAINT admins_admin_code_key UNIQUE (admin_code);
        END IF;
      END$$;
    `);
    console.log('Migration complete: admin_code column added and unique constraint ensured.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
