/**
 * Authentication routes for students
 * 
 * Admin authentication is handled in routes/admin.js:
 * - POST /api/admins/register-code - Admin registration
 * - POST /api/admins/login-code - Admin login
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database'); // pg Pool for inserts and queries
const { hashPassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * POST /api/auth/register - Student registration
 * Creates a new student account and returns a JWT token
 */
router.post('/register', async (req, res) => {
    const { name, email, password, year } = req.body;
    
    // Log registration attempt for debugging
    console.log('[STUDENT REGISTER] Registration attempt for:', email);
    
    try {
        const hashedPassword = await hashPassword(password);
        const insert = `INSERT INTO students (name, email, password, year, registration_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING id`;
        const { rows } = await pool.query(insert, [name, email, hashedPassword, year]);
        
        const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        console.log('[STUDENT REGISTER] Success for:', email);
        
        return res.status(201).json({ token, id: rows[0].id });
    } catch (error) {
        console.error('[STUDENT REGISTER] Error for', email, ':', error.message);
        
        const msg = String(error.message).toLowerCase();
        if (String(error.code) === '23505' || msg.includes('students_email_key')) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

module.exports = router;
