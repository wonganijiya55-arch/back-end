/**
 * CORS Configuration for Backend API
 * 
 * Allows requests from:
 * - Production frontend (GitHub Pages)
 * - Local development servers (multiple ports)
 * - Render backend instances
 */
const allowedOrigins = [
  'https://ices-static-site-hyyr.onrender.com',
  'https://wonganijiya55-arch.github.io',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:3000',
  // Note: Origin headers never include paths, but this entry
  // helps clarify the intended allowed caller for /api/login during dev
  'http://localhost:3000/api/login',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:3000',
  'https://back-end-9-qudx.onrender.com'
];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, Postman, curl)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin (non-browser tool)');
      return callback(null, true);
    }
    
    // In development/non-production, allow any localhost/127.0.0.1 origin
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:[3-9]\d{3})?$/.test(origin);
      if (isLocalhost) {
        console.log('[CORS] [DEV] Allowing localhost origin:', origin);
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('[CORS] Allowing request from:', origin);
      return callback(null, true);
    }
    
    // Log and reject disallowed origins
    console.warn('[CORS] Blocked request from disallowed origin:', origin);
    console.warn('[CORS] Allowed origins are:', allowedOrigins.join(', '));
    
    const err = new Error(`CORS policy: Origin "${origin}" is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`);
    err.status = 403;
    callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Broaden allowed headers for common frontend requests and smoother preflights
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204,
};

module.exports = { corsOptions, allowedOrigins };
