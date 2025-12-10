// routes/login.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../config/database"); // sqlite3 Database instance (callback API)

// POST /api/login - generic login for student or admin
router.post("/", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // 1) Try student first
  db.get("SELECT * FROM students WHERE email = ?", [email], async (err, student) => {
    if (err) return res.status(500).json({ error: "Database error", details: err.message });

    if (student) {
      try {
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
      } catch (e) {
        return res.status(500).json({ error: "Server error", details: e.message });
      }
    }

    // 2) Not a student, try admin
    db.get("SELECT * FROM admins WHERE email = ?", [email], async (err2, admin) => {
      if (err2) return res.status(500).json({ error: "Database error", details: err2.message });
      if (!admin) return res.status(404).json({ error: "User not found" });
      try {
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
        return res.status(500).json({ error: "Server error", details: e.message });
      }
    });
  });
});

module.exports = router;
