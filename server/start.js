require('dotenv').config();
const createApp = require('./app');
const { testConnection, initTables } = require('../config/database');
const { allowedOrigins } = require('./cors');

const PORT = process.env.PORT || 5000;

console.log('\n========================================');
console.log('🚀 Starting Backend Server');
console.log('========================================');

console.log('\n📊 Environment Configuration:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   PORT:', PORT);
console.log('   RENDER:', process.env.RENDER ? '✅ Yes' : '❌ No (local)');

console.log('\n📊 Database Configuration:');
console.log('   DATABASE_URL (fallback):', process.env.DATABASE_URL ? '✅ [set]' : '❌ [missing]');
console.log('   DATABASE_URL_INTERNAL:', process.env.DATABASE_URL_INTERNAL ? '✅ [set]' : '❌ [missing]');
console.log('   DATABASE_URL_EXTERNAL:', process.env.DATABASE_URL_EXTERNAL ? '✅ [set]' : '❌ [missing]');

console.log('\n🔐 Security Configuration:');
console.log('   JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY ? '✅ [set]' : '⚠️  [missing]');

console.log('\n🌐 CORS Configuration:');
console.log('   Allowed origins:', allowedOrigins.join(', '));

console.log('\n🔄 Initializing database...');

(async () => {
  await testConnection();
  await initTables();

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log('\n========================================');
    console.log(`✅ Server is running on port ${PORT}`);
    console.log('========================================\n');
  });

  const shutdown = (signal) => () => {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
})().catch((err) => {
  console.error('\n❌ Startup failed:', err.message);
  console.error('\n💡 Troubleshooting tips:');
  console.error('   1. Check that DATABASE_URL is set correctly');
  console.error('   2. Verify database server is running and accessible');
  console.error('   3. Confirm network connectivity to database host');
  console.error('   4. Check database credentials are correct');
  console.error('\n========================================\n');
  process.exit(1);
});
