/**
 * Student login route
 * 
 * Admin login is handled separately via code-based authentication:
 * - POST /api/admins/register-code - Request admin code
 * - POST /api/admins/login-code - Login with code
 */
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

/**
 * POST /api/login - Student login with email and password
 * Returns user info and redirect URL on success
 */
router.post("/", async (req, res) => {
  const { email, password } = req.body;
  
  // Log login attempt for debugging
  console.log('[STUDENT LOGIN] Login attempt for:', email);
  
  if (!email || !password) {
    console.log('[STUDENT LOGIN] Missing credentials');
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  try {
    // Query student by email
    const studentRes = await pool.query("SELECT * FROM students WHERE email = $1", [email]);
    const student = studentRes.rows[0];
    
    if (!student) {
      console.log('[STUDENT LOGIN] Student not found:', email);
      return res.status(404).json({ error: "User not found" });
    }
    
    // Verify password
    const ok = await bcrypt.compare(password, student.password);
    if (!ok) {
      console.log('[STUDENT LOGIN] Invalid password for:', email);
      return res.status(401).json({ error: "Invalid password" });
    }
    
    console.log('[STUDENT LOGIN] Success for:', email);
    const redirectPath = "/docs/students.html";
    if (process.env.DEV_CODE_LOG === 'true' || process.env.DEV_CODE_RESPONSE === 'true') {
      console.log('[STUDENT LOGIN] Returning absolute redirect:', redirectPath);
    }
    return res.json({
      message: "Login successful",
      role: "student",
      redirect: "/docs/students.html",  
      userId: student.id,
      name: student.name,
      email: student.email
    });
  } catch (e) {
    console.error('[STUDENT LOGIN] Database error for', email, ':', e.message);
    console.error('[STUDENT LOGIN] Error code:', e.code);
    console.error('[STUDENT LOGIN] Error details:', e);
    return res.status(500).json({ 
      error: "Database error", 
      details: e.message,
      code: e.code 
    });
  }
});

module.exports = router;
