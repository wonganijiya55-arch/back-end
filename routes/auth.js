const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');
require('dotenv').config();

//student registration//
router.post('/register', async (req, res) => {
    const { name, email, password, year } = req.body;
    try {
        // TODO: Implement real persistence (SQLite adaptation). Placeholder response only.
        const hashedPassword = await hashPassword(password);
        const fakeId = Date.now();
        const token = jwt.sign({ id: fakeId }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        return res.status(201).json({ token, id: fakeId, note: 'Stub implementation – replace with DB logic' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
