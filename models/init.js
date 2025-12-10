const db = require('../config/database');

db.serialize(() => {
    // Students
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        year INTEGER,
        registration_date TEXT,
        status TEXT DEFAULT 'active'
    )`);

    // Admin
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        admin_code TEXT UNIQUE
    )`);
    // Event Registrations (student-event relationship)
    db.run(`CREATE TABLE IF NOT EXISTS event_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        event_id INTEGER,
        event_name TEXT,
        registration_date TEXT,
        status TEXT DEFAULT 'registered',
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(event_id) REFERENCES events(id)
    )`);

    // Payments
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        purpose TEXT,
        amount REAL,
        method TEXT,
        date TEXT,
            status TEXT,
            proof_file TEXT,
        FOREIGN KEY(student_id) REFERENCES students(id)
    )`);
});

module.exports = db;
