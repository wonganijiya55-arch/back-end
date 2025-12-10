const express = require('express');
const router = express.Router();
const { pool } = require('../config/database'); // pg Pool for admin ops
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

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

// POST /api/admins/register - Register a new admin
// Register a new admin
router.post('/register', 
    // Validation middleware
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('adminCode').notEmpty().withMessage('Admin code is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, adminCode } = req.body;

        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            try {
                const query = `INSERT INTO admins (username, email, password, admin_code) VALUES ($1, $2, $3, $4) RETURNING id`;
                const { rows } = await pool.query(query, [username, email, hashedPassword, adminCode]);
                res.status(201).json({ message: 'Admin registration successful', adminId: rows[0].id });
            } catch (err) {
                const msg = String(err.message).toLowerCase();
                if (msg.includes('admins_admin_code_key') || String(err.code) === '23505') {
                    return res.status(400).json({ message: 'Admin code already chosen. Please select another code.' });
                }
                if (msg.includes('admins_username_key')) {
                    return res.status(400).json({ message: 'Username already registered' });
                }
                if (msg.includes('admins_email_key')) {
                    return res.status(400).json({ message: 'Email already registered' });
                }
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
);

// POST /api/admins/login - Admin login
// Admin login
router.post('/login',
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        try {
            const { rows } = await pool.query(`SELECT * FROM admins WHERE email = $1`, [email]);
            const admin = rows[0];
            if (!admin) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            const match = await bcrypt.compare(password, admin.password);
            if (!match) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            res.json({ message: 'Login successful', adminId: admin.id, username: admin.username, email: admin.email });
        } catch (error) {
            res.status(500).json({ message: 'Database error', error: error.message });
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
        WHERE p.id = ?
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
