require('dotenv').config();
const createApp = require('./app');
const { testConnection, initTables } = require('../config/database');

const PORT = process.env.PORT || 5000;

(async () => {
  await testConnection();
  await initTables();

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  const shutdown = (signal) => () => {
    console.log(`${signal} received. Shutting down...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
})().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
