const express = require('express');
const router = express.Router();
const { pool } = require('../config/database'); // pg Pool for admin ops
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');

// GET /api/admins - List all admins
// List admins
router.get('/', async (req, res) => {
    try {
        const query = `SELECT id, username, email FROM admins`;
        const { rows } = await pool.query(query);
        res.json({ admins: rows });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// REMOVED: Traditional password-based admin registration
// Use POST /api/admins/register-code instead for secure code-based registration

// REMOVED: Password-based admin login
// Use POST /api/admins/login-code instead for secure code-based login

/**
 * POST /api/admins/register-code - Primary admin registration endpoint
 * 
 * This is the ONLY admin registration endpoint. It implements secure code-based registration:
 * 1. Admin provides: name, email, regNumber, year
 * 2. System generates a 6-digit code and emails it
 * 3. Admin uses the code with /api/admins/login-code to authenticate
 * 
 * Security features:
 * - Codes expire after 15 minutes
 * - Rate limited to 5 codes per hour per admin
 * - Codes are stored hashed in admin_codes table
 * - Maximum 5 attempts per code
 */
router.post(
    '/register-code',
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('regNumber').notEmpty().withMessage('Registration number is required'),
    body('year').isInt({ min: 1 }).withMessage('Year must be a positive integer'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const name = String(req.body.name).trim();
        const email = String(req.body.email).trim().toLowerCase();
        const regNumber = String(req.body.regNumber).trim().toUpperCase();
        const year = parseInt(req.body.year, 10);

        // Rate limit: max 5 codes issued in the last hour per admin
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        try {
            // Upsert admin by reg_number or email
            let adminId;
            const { rows: byReg } = await pool.query('SELECT id FROM admins WHERE reg_number = $1', [regNumber]);
            if (byReg.length > 0) {
                adminId = byReg[0].id;
                await pool.query('UPDATE admins SET username = $1, email = $2, year = $3 WHERE id = $4', [name, email, year, adminId]);
            } else {
                const { rows: byEmail } = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
                if (byEmail.length > 0) {
                    adminId = byEmail[0].id;
                    await pool.query('UPDATE admins SET username = $1, reg_number = $2, year = $3 WHERE id = $4', [name, regNumber, year, adminId]);
                } else {
                    const randomPwd = crypto.randomBytes(12).toString('hex');
                    const hashedPwd = await bcrypt.hash(randomPwd, 10);
                    const insert = 'INSERT INTO admins (username, email, password, reg_number, year) VALUES ($1, $2, $3, $4, $5) RETURNING id';
                    const { rows } = await pool.query(insert, [name, email, hashedPwd, regNumber, year]);
                    adminId = rows[0].id;
                }
            }

            const { rows: recent } = await pool.query(
                'SELECT COUNT(*)::int AS count FROM admin_codes WHERE admin_id = $1 AND issued_at >= $2',
                [adminId, oneHourAgo]
            );
            if (recent[0].count >= 5) {
                return res.status(429).json({ message: 'Rate limited. Try again later.' });
            }

            // Generate short numeric/alphanumeric code (6 digits)
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const codeHash = await bcrypt.hash(code, 10);
            const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes TTL
            await pool.query(
                'INSERT INTO admin_codes (admin_id, code_hash, expires_at, attempts_left) VALUES ($1, $2, $3, $4)',
                [adminId, codeHash, expiresAt, 5]
            );

            // Email the code; dev-only helpers to unblock testing
            const devExpose = String(process.env.DEV_CODE_RESPONSE).toLowerCase() === 'true';
            const devLog = String(process.env.DEV_CODE_LOG).toLowerCase() === 'true';
            try {
                await sendEmail(
                    email,
                    'Your ICES Admin Code',
                    `Hello ${name},\n\nYour admin code is: ${code}\nIt expires in 15 minutes.\n\nRegards,\nICES Support`
                );
            } catch (mailErr) {
                if (devLog) console.log('[DEV] Admin code for', email, 'is', code);
                if (devExpose) {
                    return res.status(201).json({ message: 'Admin code generated (email failed in dev)', devCode: code });
                }
                return res.status(502).json({ message: 'Failed to send code email', error: mailErr.message });
            }

            if (devLog) console.log('[DEV] Admin code for', email, 'is', code);
            return res.status(201).json({ message: 'Admin code sent to email', ...(devExpose ? { devCode: code } : {}) });
        } catch (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
    }
);

/**
 * POST /api/admins/login-code - Primary admin login endpoint
 * 
 * This is the ONLY admin login endpoint. Authenticates using the code from registration:
 * - Required fields: regNumber, name, adminCode
 * - Validates code hasn't expired or been used
 * - Checks attempt limits
 * - Returns user info on success
 */
router.post(
    '/login-code',
    body('regNumber').notEmpty().withMessage('Registration number is required'),
    body('name').notEmpty().withMessage('Full name is required'),
    body('adminCode').notEmpty().withMessage('Admin code is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const regNumber = String(req.body.regNumber).trim().toUpperCase();
        const name = String(req.body.name).trim();
        const adminCode = String(req.body.adminCode).trim();
        try {
            const { rows: admins } = await pool.query('SELECT id, username, email FROM admins WHERE reg_number = $1', [regNumber]);
            const admin = admins[0];
            if (!admin) return res.status(404).json({ message: 'Admin not found' });

            // Case-insensitive compare for name
            const normalizedDbName = String(admin.username).trim().toLowerCase();
            const normalizedReqName = name.toLowerCase();
            if (normalizedDbName !== normalizedReqName) {
                return res.status(401).json({ message: 'Invalid name' });
            }

            // Get latest active code record
            const { rows: codes } = await pool.query(
                'SELECT id, code_hash, expires_at, attempts_left, used_at FROM admin_codes WHERE admin_id = $1 ORDER BY issued_at DESC LIMIT 1',
                [admin.id]
            );
            const codeRec = codes[0];
            if (!codeRec) return res.status(401).json({ message: 'No code available. Request a new code.' });
            if (codeRec.used_at) return res.status(401).json({ message: 'Code already used. Request a new code.' });
            if (new Date(codeRec.expires_at) < new Date()) return res.status(401).json({ message: 'Code expired. Request a new code.' });
            if (codeRec.attempts_left <= 0) return res.status(429).json({ message: 'Too many attempts. Request a new code.' });

            const ok = await bcrypt.compare(adminCode, codeRec.code_hash);
            if (!ok) {
                await pool.query('UPDATE admin_codes SET attempts_left = attempts_left - 1 WHERE id = $1', [codeRec.id]);
                return res.status(401).json({ message: 'Invalid code' });
            }

            // Mark used and respond
            await pool.query('UPDATE admin_codes SET used_at = NOW() WHERE id = $1', [codeRec.id]);
            return res.json({ role: 'admin', userId: admin.id, name: admin.username, email: admin.email, redirect: 'admin.html' });
        } catch (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
    }
);

// GET /api/admins/students - Get all registered students (admin access)
// List all students (admin view)
router.get('/students', async (req, res) => {
    try {
        const query = `SELECT id, name, email, year, registration_date FROM students ORDER BY registration_date DESC`;
        const { rows } = await pool.query(query);
        res.json({ students: rows, count: rows.length, message: 'Students retrieved successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// GET /api/admins/students/:id - Get specific student details (admin access)
// Get a student by id
router.get('/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `SELECT id, name, email, year, registration_date FROM students WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        const student = rows[0];
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ student });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// GET /api/admins/events - Get all events (admin access)
// List events (admin view)
router.get('/events', async (req, res) => {
    try {
        const query = `SELECT id, title, description, event_date AS date FROM events ORDER BY event_date DESC`;
        const { rows } = await pool.query(query);
        res.json({ events: rows, count: rows.length });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// GET /api/admins/registrations - Get all event registrations (admin access)
// List all event registrations
router.get('/registrations', async (req, res) => {
    const query = `
        SELECT er.*, s.name as student_name, s.email as student_email 
        FROM event_registrations er
        JOIN students s ON er.student_id = s.id
        ORDER BY er.created_at DESC
    `;
    try {
        const { rows } = await pool.query(query);
        res.json({ registrations: rows, count: rows.length });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// GET /api/admins/payments - Get all payments (admin access)
// List all payments
router.get('/payments', async (req, res) => {
    const query = `
        SELECT p.*, s.name as student_name, s.email as student_email 
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        ORDER BY p.date DESC
    `;
    try {
        const { rows } = await pool.query(query);
        res.json({ payments: rows, count: rows.length, message: 'Payments retrieved successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// GET /api/admins/payments/:id - Get specific payment details (admin access)
// Get a payment by id
router.get('/payments/:id', async (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT p.*, s.name as student_name, s.email as student_email 
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        WHERE p.id = $1
    `;
    try {
        const { rows } = await pool.query(query, [id]);
        const payment = rows[0];
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        res.json({ payment });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// GET /api/admins/health - Health check endpoint
router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;