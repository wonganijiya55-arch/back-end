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
    if (!name || !email || !password || !year) {
        return res.status(400).json({
            success: false,
            error: 'All fields are required'
        });
    }
    try {
        const hashedPassword = await hashPassword(password);
        const insert = `INSERT INTO students (name, email, password, year, registration_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email`;
        const { rows } = await pool.query(insert, [name, email, hashedPassword, year]);
        return res.status(201).json({
            success: true,
            role: 'student',
            user: {
                id: rows[0].id,
                name: rows[0].name,
                email: rows[0].email
            }
        });
    } catch (error) {
        console.error('[STUDENT REGISTER] Error for', email, ':', error.message);
        const msg = String(error.message).toLowerCase();
        if (String(error.code) === '23505' || msg.includes('students_email_key')) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});

module.exports = router;
