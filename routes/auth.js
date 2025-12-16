// Basic auth endpoints (e.g., student registration with JWT)
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database'); // pg Pool for inserts and queries
const { hashPassword, comparePassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utils/sendEmail');
require('dotenv').config();

//student registration//
// Register a student and return a JWT
router.post('/register', async (req, res) => {
    const { name, email, password, year } = req.body;
    try {
        const hashedPassword = await hashPassword(password);
        const insert = `INSERT INTO students (name, email, password, year, registration_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING id`;
        const { rows } = await pool.query(insert, [name, email, hashedPassword, year]);
        const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        return res.status(201).json({ token, id: rows[0].id });
    } catch (error) {
        const msg = String(error.message).toLowerCase();
        if (String(error.code) === '23505' || msg.includes('students_email_key')) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

// --- Admin code-based flow under /api/auth ---

// POST /api/auth/admin/register
// Accepts various payload shapes; we only require name/username and email.
router.post('/admin/register', async (req, res) => {
    const name = req.body.name || req.body.username || req.body.fullName || req.body.user || 'Admin';
    const email = req.body.email;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    try {
        const { rows: existing } = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
        if (existing.length > 0) {
            await pool.query('UPDATE admins SET admin_code = $1, username = $2 WHERE email = $3', [code, name, email]);
        } else {
            const randomPwd = crypto.randomBytes(12).toString('hex');
            const hashed = await bcrypt.hash(randomPwd, 10);
            await pool.query('INSERT INTO admins (username, email, password, admin_code) VALUES ($1, $2, $3, $4)', [name, email, hashed, code]);
        }

        try {
            await sendEmail(
                email,
                'Your ICES Admin Code',
                `Hello ${name},\n\nYour admin code is: ${code}\n\nUse this code to complete your login.`
            );
        } catch (mailErr) {
            return res.status(502).json({ message: 'Failed to send code email', error: mailErr.message });
        }

        return res.status(201).json({ message: 'Admin code generated and emailed' });
    } catch (err) {
        if (String(err.code) === '23505') {
            return res.status(409).json({ message: 'Code collision, please retry' });
        }
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// POST /api/auth/admin/login-code
router.post('/admin/login-code', async (req, res) => {
    const adminCode = req.body.adminCode || req.body.code;
    const name = req.body.name || req.body.username;
    if (!adminCode) return res.status(400).json({ message: 'Admin code is required' });

    try {
        const params = [adminCode];
        let query = 'SELECT id, username, email FROM admins WHERE admin_code = $1';
        if (name) { query += ' AND username = $2'; params.push(name); }
        const { rows } = await pool.query(query, params);
        const admin = rows[0];
        if (!admin) return res.status(401).json({ message: 'Invalid admin code or name' });
        return res.json({ message: 'Login successful', adminId: admin.id, username: admin.username, email: admin.email });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});
