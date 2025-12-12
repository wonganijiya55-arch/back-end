// Unified JSON error handler
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Server error';
  res.status(status).json({ error: message });
};
