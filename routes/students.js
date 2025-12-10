const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// GET /api/students - List all students
router.get('/', (req, res) => {
    const query = `SELECT id, name, email, year, registration_date, status FROM students`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ students: rows });
    });
});

// POST /api/students/register - Register a new student
router.post('/register', 
    // Validation middleware
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('year').isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, year } = req.body;

        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            const query = `INSERT INTO students (name, email, password, year, registration_date) VALUES (?, ?, ?, ?, datetime('now'))`;
            db.run(query, [name, email, hashedPassword, year], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ message: 'Email already registered' });
                    }
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }

                // Respond with student ID
                res.status(201).json({ message: 'Registration successful', studentId: this.lastID });
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
);

// POST /api/students/login - Student login
router.post('/login',
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        db.get(`SELECT * FROM students WHERE email = ?`, [email], async (err, student) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (!student) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            try {
                const match = await bcrypt.compare(password, student.password);
                if (!match) {
                    return res.status(401).json({ message: 'Invalid email or password' });
                }

                res.json({ 
                    message: 'Login successful', 
                    studentId: student.id,
                    name: student.name,
                    email: student.email,
                    year: student.year,
                    status: student.status
                });
            } catch (error) {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });
    }
);

// GET /api/students/health - Health check endpoint
router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
