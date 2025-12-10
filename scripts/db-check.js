// scripts/db-check.js
// Quick connectivity check for PostgreSQL with clear diagnostics
require('dotenv').config();

const { URL } = require('url');
const { testConnection } = require('../config/database');

(async () => {
  try {
    const isRender = !!process.env.RENDER;
    const hasInternal = !!process.env.DATABASE_URL_INTERNAL;
    const hasExternal = !!process.env.DATABASE_URL_EXTERNAL;
    const hasFallback = !!process.env.DATABASE_URL;

    let selected = null;
    let selectedName = null;
    if (isRender && hasInternal) {
      selected = process.env.DATABASE_URL_INTERNAL;
      selectedName = 'DATABASE_URL_INTERNAL (Render)';
    } else if (hasExternal) {
      selected = process.env.DATABASE_URL_EXTERNAL;
      selectedName = 'DATABASE_URL_EXTERNAL (External)';
    } else if (hasFallback) {
      selected = process.env.DATABASE_URL;
      selectedName = 'DATABASE_URL (Fallback)';
    }

    console.log('Env present:');
    console.log('- RENDER:', isRender ? 'true' : 'false');
    console.log('- DATABASE_URL_INTERNAL:', hasInternal ? '[set]' : '[missing]');
    console.log('- DATABASE_URL_EXTERNAL:', hasExternal ? '[set]' : '[missing]');
    console.log('- DATABASE_URL:', hasFallback ? '[set]' : '[missing]');

    if (!selected) {
      throw new Error('No database URL set. Set DATABASE_URL_INTERNAL or DATABASE_URL_EXTERNAL or DATABASE_URL');
    }

    let parsed;
    try {
      parsed = new URL(selected);
    } catch {
      console.warn('Warning: Selected connection string is not a valid URL format for parsing. Attempting connection anyway.');
    }

    if (parsed) {
      console.log('Selected:', selectedName);
      console.log(`Host: ${parsed.hostname}`);
      console.log(`Port: ${parsed.port || '(default)'}`);
      console.log(`DB: ${parsed.pathname?.replace(/^\//, '') || '(unknown)'}`);
      console.log('SSL: required (rejectUnauthorized=false)');
    }

    await testConnection();
    console.log('DB connectivity check: OK');
    process.exit(0);
  } catch (err) {
    console.error('DB connectivity check: FAILED');
    console.error('Error code:', err.code || 'N/A');
    console.error('Message:', err.message);
    process.exit(1);
  }
})();
