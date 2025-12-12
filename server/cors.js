// Strict CORS config with credentials for allowed origins
const allowedOrigins = [
  'https://wonganijiya55-arch.github.io',
  'http://127.0.0.1:5501',
  'http://localhost:5501',
  'https://back-end-3-agho.onrender.com',
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const err = new Error('CORS: Origin not allowed');
    err.status = 403;
    callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = { corsOptions };
