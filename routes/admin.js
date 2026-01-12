// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { generateToken, verifyToken, verifyAdmin } = require("../middleware/auth");

// POST /api/admins/register - Admin registration
router.post("/register", async (req, res) => {
  const { username, email, password,reg_number,year } = req.body;
  if (!username || !email || !password || !reg_number || !year) {
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
      "INSERT INTO admins (username, email, reg_number, password, year) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email",
      [username, email, reg_number, hashed, year]
    );
    
    // Generate JWT token
    const token = generateToken({
      id: result.rows[0].id,
      email: result.rows[0].email,
      role: "admin"
    });
    
    res.status(201).json({
      success: true,
      role: "admin",
      token,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
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
    
    // Generate JWT token
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: "admin"
    });
    
    res.json({
      success: true,
      role: "admin",
      redirect: "/docs/admin.html",
      token,
      user: {
        id: admin.id,
        username: admin.username,
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

// ============================================
// Protected Admin Endpoints
// ============================================

// GET /api/admins/students - List all students
router.get("/students", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, fullname, email, year,regnumber,registration_date FROM students ORDER BY registration_date DESC"
    );
    res.json({
      success: true,
      students: rows
    });
  } catch (err) {
    console.error("[ADMIN GET STUDENTS ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// GET /api/admins/students/:id - Get student by ID
router.get("/students/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  
  // Validate ID is a positive integer
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid student ID"
    });
  }
  
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, year, registration_date FROM students WHERE id = $1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }
    res.json({
      success: true,
      student: rows[0]
    });
  } catch (err) {
    console.error("[ADMIN GET STUDENT ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// GET /api/admins/payments - List all payments with student names
router.get("/payments", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.student_id, p.purpose, p.amount, p.method, p.date,
             s.name as student_name, s.email as student_email
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      ORDER BY p.date DESC
    `);
    res.json({
      success: true,
      payments: rows
    });
  } catch (err) {
    console.error("[ADMIN GET PAYMENTS ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// GET /api/admins/payments/:id - Get payment by ID
router.get("/payments/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  
  // Validate ID is a positive integer
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid payment ID"
    });
  }
  
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.student_id, p.purpose, p.amount, p.method, p.date,
             s.name as student_name, s.email as student_email
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      WHERE p.id = $1
    `, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Payment not found"
      });
    }
    res.json({
      success: true,
      payment: rows[0]
    });
  } catch (err) {
    console.error("[ADMIN GET PAYMENT ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// GET /api/admins/events - List all events
router.get("/events", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, description, event_date FROM events ORDER BY event_date DESC"
    );
    res.json({
      success: true,
      events: rows
    });
  } catch (err) {
    console.error("[ADMIN GET EVENTS ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// POST /api/admins/events - Create event
router.post("/events", verifyToken, verifyAdmin, async (req, res) => {
  const { title, description, event_date } = req.body;
  if (!title || !event_date) {
    return res.status(400).json({
      success: false,
      error: "Title and event_date are required"
    });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO events (title, description, event_date) VALUES ($1, $2, $3) RETURNING id, title, description, event_date",
      [title, description ?? "", event_date]
    );
    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: rows[0]
    });
  } catch (err) {
    console.error("[ADMIN CREATE EVENT ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// PUT /api/admins/events/:id - Update event
router.put("/events/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, event_date } = req.body;
  
  // Validate ID is a positive integer
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid event ID"
    });
  }
  
  if (!title || !event_date) {
    return res.status(400).json({
      success: false,
      error: "Title and event_date are required"
    });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE events SET title = $1, description = $2, event_date = $3 WHERE id = $4 RETURNING id, title, description, event_date",
      [title, description ?? "", event_date, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Event not found"
      });
    }
    res.json({
      success: true,
      message: "Event updated successfully",
      event: rows[0]
    });
  } catch (err) {
    console.error("[ADMIN UPDATE EVENT ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// DELETE /api/admins/events/:id - Delete event
router.delete("/events/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  
  // Validate ID is a positive integer
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid event ID"
    });
  }
  
  try {
    const { rowCount } = await pool.query("DELETE FROM events WHERE id = $1", [id]);
    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Event not found"
      });
    }
    res.json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (err) {
    console.error("[ADMIN DELETE EVENT ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

// GET /api/admins/registrations - List all event registrations
router.get("/registrations", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT er.id, er.student_id, er.event_name, er.created_at,
             s.name as student_name, s.email as student_email
      FROM event_registrations er
      LEFT JOIN students s ON er.student_id = s.id
      ORDER BY er.created_at DESC
    `);
    res.json({
      success: true,
      registrations: rows
    });
  } catch (err) {
    console.error("[ADMIN GET REGISTRATIONS ERROR]", err);
    res.status(500).json({
      success: false,
      error: "Database error"
    });
  }
});

module.exports = router;
