const { initTables, pool } = require('../config/database');

async function init() {
  await initTables();
}

module.exports = { init, pool };
