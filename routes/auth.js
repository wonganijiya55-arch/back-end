const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');
require('dotenv').config();

//student registration//
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
