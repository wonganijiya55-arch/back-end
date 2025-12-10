// Startup init: verify DB connection then create tables
const { testConnection, initTables, pool } = require('../config/database');

// Called by server.js before app.listen
async function init() {
  await testConnection();
  await initTables();
}

module.exports = { init, pool };
