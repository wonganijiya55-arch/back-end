// Payments listing and summary endpoints
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database'); // pg Pool for queries

// List payments with student info
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, s.name as student_name, s.email as student_email
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      ORDER BY p.date DESC
    `);
    return res.json({ payments: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Payments aggregation summary
router.get('/summary', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM payments`);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;