// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

// POST /api/admins/register - Admin registration
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: "All fields required"
    });
  }
  try {
    const existing = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
    if (existing.rows.length) {
      return res.status(400).json({
        success: false,
        error: "Admin already exists"
      });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO admins (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
      [name, email, hashed]
    );
    res.status(201).json({
      success: true,
      role: "admin",
      user: {
        id: result.rows[0].id,
        name: result.rows[0].username,
        email: result.rows[0].email
      }
    });
  } catch (err) {
    console.error("[ADMIN REGISTER ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// POST /api/admins/login - Admin login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required"
    });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
    const admin = rows[0];
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }
    res.json({
      success: true,
      role: "admin",
      redirect: "/docs/admin.html",
      user: {
        id: admin.id,
        name: admin.username,
        email: admin.email
      }
    });
  } catch (err) {
    console.error("[ADMIN LOGIN ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

module.exports = router;
