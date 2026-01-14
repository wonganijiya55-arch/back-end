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
const { generateToken } = require('../middleware/auth');
require('dotenv').config();

/**
 * POST /api/auth/register - Student registration
 * Creates a new student account and returns a JWT token
 */
router.post('/register', async (req, res) => {
    const { name, email, password, year, reg_number, role } = req.body;
    if (!name || !email || !password || !year || !reg_number || !role) {
        return res.status(400).json({
            success: false,
            error: 'All fields are required'
        });
    }
    try {
        // Check for duplicate email in both tables
        const studentCheck = await pool.query('SELECT 1 FROM students WHERE email = $1', [email]);
        const adminCheck = await pool.query('SELECT 1 FROM admins WHERE email = $1', [email]);
        if (studentCheck.rows.length > 0 || adminCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }
        const hashedPassword = await hashPassword(password);
        if (role === 'admin') {
            const insert = `INSERT INTO admins (username, email, reg_number, password, year) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email`;
            const { rows } = await pool.query(insert, [name, email, reg_number, hashedPassword, year]);
            const token = generateToken({
                id: rows[0].id,
                email: rows[0].email,
                role: 'admin'
            });
            return res.status(201).json({
                success: true,
                role: 'admin',
                token,
                user: {
                    id: rows[0].id,
                    name: rows[0].username,
                    email: rows[0].email
                }
            });
        } else {
            const insert = `INSERT INTO students (name, email, reg_number, password, year, registration_date) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, email`;
            const { rows } = await pool.query(insert, [name, email, reg_number, hashedPassword, year]);
            const token = generateToken({
                id: rows[0].id,
                email: rows[0].email,
                role: 'student'
            });
            return res.status(201).json({
                success: true,
                role: 'student',
                token,
                user: {
                    id: rows[0].id,
                    name: rows[0].name,
                    email: rows[0].email
                }
            });
        }
    } catch (error) {
        console.error('[REGISTER] Error for', email, ':', error.message);
        const msg = String(error.message).toLowerCase();
        if (String(error.code) === '23505' || msg.includes('email')) {
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
