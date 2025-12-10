const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// GET /api/admins - List all admins
router.get('/', (req, res) => {
    const query = `SELECT id, username, email FROM admins`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ admins: rows });
    });
});

// POST /api/admins/register - Register a new admin
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

            const query = `INSERT INTO admins (username, email, password, admin_code) VALUES (?, ?, ?, ?)`;
            db.run(query, [username, email, hashedPassword, adminCode], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: admins.admin_code')) {
                        return res.status(400).json({ message: 'Admin code already chosen. Please select another code.' });
                    }
                    if (err.message.includes('UNIQUE constraint failed: admins.username')) {
                        return res.status(400).json({ message: 'Username already registered' });
                    }
                    if (err.message.includes('UNIQUE constraint failed: admins.email')) {
                        return res.status(400).json({ message: 'Email already registered' });
                    }
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }

                // Respond with admin ID
                res.status(201).json({ message: 'Admin registration successful', adminId: this.lastID });
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
);

// POST /api/admins/login - Admin login
router.post('/login',
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        db.get(`SELECT * FROM admins WHERE email = ?`, [email], async (err, admin) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (!admin) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            try {
                const match = await bcrypt.compare(password, admin.password);
                if (!match) {
                    return res.status(401).json({ message: 'Invalid email or password' });
                }

                res.json({ 
                    message: 'Login successful', 
                    adminId: admin.id,
                    username: admin.username,
                    email: admin.email
                });
            } catch (error) {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });
    }
);

// GET /api/admins/students - Get all registered students (admin access)
router.get('/students', (req, res) => {
    const query = `SELECT id, name, email, year, registration_date, status FROM students ORDER BY registration_date DESC`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ 
            students: rows,
            count: rows.length,
            message: 'Students retrieved successfully'
        });
    });
});

// GET /api/admins/students/:id - Get specific student details (admin access)
router.get('/students/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT id, name, email, year, registration_date, status FROM students WHERE id = ?`;
    db.get(query, [id], (err, student) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ student });
    });
});

// GET /api/admins/events - Get all events (admin access)
router.get('/events', (req, res) => {
    const query = `SELECT * FROM events ORDER BY date DESC`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ 
            events: rows,
            count: rows.length
        });
    });
});

// GET /api/admins/registrations - Get all event registrations (admin access)
router.get('/registrations', (req, res) => {
    const query = `
        SELECT er.*, s.name as student_name, s.email as student_email 
        FROM event_registrations er
        JOIN students s ON er.student_id = s.id
        ORDER BY er.registration_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ 
            registrations: rows,
            count: rows.length
        });
    });
});

// GET /api/admins/payments - Get all payments (admin access)
router.get('/payments', (req, res) => {
    const query = `
        SELECT p.*, s.name as student_name, s.email as student_email 
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        ORDER BY p.date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ 
            payments: rows,
            count: rows.length,
            message: 'Payments retrieved successfully'
        });
    });
});

// GET /api/admins/payments/:id - Get specific payment details (admin access)
router.get('/payments/:id', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT p.*, s.name as student_name, s.email as student_email 
        FROM payments p
        LEFT JOIN students s ON p.student_id = s.id
        WHERE p.id = ?
    `;
    db.get(query, [id], (err, payment) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json({ payment });
    });
});

// GET /api/admins/health - Health check endpoint
router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
