// backend/routes/login.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

// POST /api/login - Student login
router.post("/", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required"
    });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM students WHERE email = $1", [email]);
    const student = rows[0];
    if (!student) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }
    const match = await bcrypt.compare(password, student.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }
    return res.json({
      success: true,
      role: "student",
      redirect: "/docs/students.html",
      user: {
        id: student.id,
        name: student.name,
        email: student.email
      }
    });
  } catch (err) {
    console.error("[STUDENT LOGIN ERROR]", err);
    return res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

module.exports = router;
