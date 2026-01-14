// backend/routes/login.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { generateToken } = require("../middleware/auth");

// POST /api/login - Unified login for students and admins
router.post("/", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
      role: null,
      redirect: null,
      userId: null,
      name: null,
      email: null
    });
  }
  try {
    // Try admin first
    const adminRes = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
    const admin = adminRes.rows[0];
    if (admin) {
      const match = await bcrypt.compare(password, admin.password);
      if (match) {
        // Generate JWT token for admin
        const token = generateToken({
          id: admin.id,
          email: admin.email,
          role: "admin"
        });
        return res.json({
          message: "Login successful",
          role: "admin",
          redirect: "/docs/admin.html",
          token,
          userId: admin.id,
          name: admin.username,
          email: admin.email
        });
      }
    }
    // Try student next
    const studentRes = await pool.query("SELECT * FROM students WHERE email = $1", [email]);
    const student = studentRes.rows[0];
    if (student) {
      const match = await bcrypt.compare(password, student.password);
      if (match) {
        // Generate JWT token for student
        const token = generateToken({
          id: student.id,
          email: student.email,
          role: "student"
        });
        return res.json({
          message: "Login successful",
          role: "student",
          redirect: "/docs/students.html",
          token,
          userId: student.id,
          name: student.name,
          email: student.email
        });
      }
    }
    // Invalid credentials
    return res.status(401).json({
      message: "Invalid credentials",
      role: null,
      redirect: null,
      userId: null,
      name: null,
      email: null
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({
      message: "Database error",
      role: null,
      redirect: null,
      userId: null,
      name: null,
      email: null
    });
  }
});

module.exports = router;
