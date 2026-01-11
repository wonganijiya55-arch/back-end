const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Generate a JWT token
 * @param {Object} payload - Data to encode in token (e.g., { id, email, role })
 * @param {String} expiresIn - Token expiration time (default: '7d')
 * @returns {String} JWT token
 */
function generateToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn });
}

/**
 * Verify JWT token middleware
 * Extracts token from Authorization header (Bearer token)
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({
            success: false,
            error: 'A token is required for authentication'
        });
    }
    
    // Support both "Bearer <token>" and plain token formats
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: 'Invalid Token'
        });
    }
}

/**
 * Verify admin role middleware
 * Must be used after verifyToken
 */
function verifyAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    
    next();
}

/**
 * Verify student role middleware
 * Must be used after verifyToken
 */
function verifyStudent(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (req.user.role !== 'student') {
        return res.status(403).json({
            success: false,
            error: 'Student access required'
        });
    }
    
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    verifyAdmin,
    verifyStudent
};
