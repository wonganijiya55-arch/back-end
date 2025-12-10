const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

router.get('/', async (req, res) => {
    try {
        const query = `SELECT id, title, description, event_date AS date FROM events`;
        const { rows } = await pool.query(query);
        res.json({ events: rows });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

router.post('/',
    body('title').notEmpty().withMessage('Event title is required'),
    body('description').optional(),
    body('date').notEmpty().withMessage('Event date is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { title, description, date } = req.body;
        try {
            const query = `INSERT INTO events (title, description, event_date) VALUES ($1, $2, $3) RETURNING id`;
            const { rows } = await pool.query(query, [title, description || '', date]);
            res.status(201).json({ message: 'Event created successfully', eventId: rows[0].id });
        } catch (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
    }
);

router.post('/register',
    body('studentId').isInt().withMessage('Valid student ID is required'),
    body('eventName').notEmpty().withMessage('Event name is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { studentId, eventName } = req.body;
        try {
            const sRes = await pool.query(`SELECT id FROM students WHERE id = $1`, [studentId]);
            if (sRes.rowCount === 0) {
                return res.status(404).json({ message: 'Student not found' });
            }
            const query = `INSERT INTO event_registrations (student_id, event_name, created_at) VALUES ($1, $2, NOW()) RETURNING id`;
            const { rows } = await pool.query(query, [studentId, eventName]);
            res.status(201).json({ message: 'Registration successful', registrationId: rows[0].id, studentId, eventName });
        } catch (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
    }
);

router.get('/registrations/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const query = `SELECT er.*, s.name as student_name FROM event_registrations er JOIN students s ON er.student_id = s.id WHERE er.student_id = $1`;
        const { rows } = await pool.query(query, [studentId]);
        res.json({ registrations: rows });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

router.get('/upcoming', async (req, res) => {
    try {
        const query = `SELECT id, title, description, event_date AS date FROM events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC`;
        const { rows } = await pool.query(query);
        res.json({ upcoming: rows });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
});

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
