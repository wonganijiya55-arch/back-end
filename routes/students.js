const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// GET /api/students - List all students
router.get('/', async (req, res) => {
    try {
        const query = `SELECT id, name, email, year, registration_date FROM students`;
        const { rows } = await pool.query(query);
        res.json({ students: rows });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
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
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `INSERT INTO students (name, email, password, year, registration_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING id`;
            const { rows } = await pool.query(query, [name, email, hashedPassword, year]);
            res.status(201).json({ message: 'Registration successful', studentId: rows[0].id });
        } catch (error) {
            if (String(error.message).includes('unique') || String(error.code) === '23505') {
                return res.status(400).json({ message: 'Email already registered' });
            }
            res.status(500).json({ message: 'Database error', error: error.message });
        }
    }
);

// POST /api/students/login - Student login
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
            const { rows } = await pool.query(`SELECT * FROM students WHERE email = $1`, [email]);
            const student = rows[0];
            if (!student) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            const match = await bcrypt.compare(password, student.password);
            if (!match) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            res.json({
                message: 'Login successful',
                studentId: student.id,
                name: student.name,
                email: student.email,
                year: student.year
            });
        } catch (error) {
            res.status(500).json({ message: 'Database error', error: error.message });
        }
    }
);

// GET /api/students/health - Health check endpoint
router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
