const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');

router.get('/', (req, res) => {
    const query = `SELECT id, title, description, date FROM events`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ events: rows });
    });
});

router.post('/',
    body('title').notEmpty().withMessage('Event title is required'),
    body('description').optional(),
    body('date').notEmpty().withMessage('Event date is required'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { title, description, date } = req.body;
        const query = `INSERT INTO events (title, description, date) VALUES (?, ?, ?)`;
        db.run(query, [title, description || '', date], function(err) {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.status(201).json({ message: 'Event created successfully', eventId: this.lastID });
        });
    }
);

router.post('/register',
    body('studentId').isInt().withMessage('Valid student ID is required'),
    body('eventName').notEmpty().withMessage('Event name is required'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { studentId, eventName } = req.body;
        db.get(`SELECT id FROM students WHERE id = ?`, [studentId], (err, student) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            const query = `INSERT INTO event_registrations (student_id, event_name, registration_date) VALUES (?, ?, datetime('now'))`;
            db.run(query, [studentId, eventName], function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                res.status(201).json({ message: 'Registration successful', registrationId: this.lastID, studentId: studentId, eventName: eventName });
            });
        });
    }
);

router.get('/registrations/:studentId', (req, res) => {
    const { studentId } = req.params;
    const query = `SELECT er.*, s.name as student_name FROM event_registrations er JOIN students s ON er.student_id = s.id WHERE er.student_id = ?`;
    db.all(query, [studentId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ registrations: rows });
    });
});

router.get('/upcoming', (req, res) => {
    const query = `SELECT id, title, description, date FROM events WHERE date >= date('now') ORDER BY date ASC`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({ upcoming: rows });
    });
});

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
