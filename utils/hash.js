// Password hashing helpers (bcryptjs)
const bcrypt = require('bcryptjs');

// Hash a password with fixed salt rounds
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Securely compare a plaintext password to a hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword
};