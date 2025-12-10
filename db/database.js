// Deprecated SQLite module. Use ../config/database for PostgreSQL Pool.
const { pool, initTables } = require('../config/database');

module.exports = { pool, initTables };
