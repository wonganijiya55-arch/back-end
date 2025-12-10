// routes/login.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

// POST /api/login - generic login for student or admin
router.post("/", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const studentRes = await pool.query("SELECT * FROM students WHERE email = $1", [email]);
    const student = studentRes.rows[0];
    if (student) {
      const ok = await bcrypt.compare(password, student.password);
      if (!ok) return res.status(401).json({ error: "Invalid password" });
      return res.json({
        message: "Login successful",
        role: "student",
        redirect: "/dashboards/students.html",
        userId: student.id,
        name: student.name,
        email: student.email
      });
    }

    const adminRes = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
    const admin = adminRes.rows[0];
    if (!admin) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: "Invalid password" });
    return res.json({
      message: "Login successful",
      role: "admin",
      redirect: "/dashboards/admin.html",
      userId: admin.id,
      username: admin.username,
      email: admin.email
    });
  } catch (e) {
    return res.status(500).json({ error: "Database error", details: e.message });
  }
});

module.exports = router;
