const { testConnection, initTables, pool } = require('../config/database');

async function init() {
  await testConnection();
  await initTables();
}

module.exports = { init, pool };
