# Authentication Guide

This document describes the authentication flows for the ICES backend system.

## Overview

The system has two distinct authentication flows:
1. **Student Authentication** - Traditional email/password login
2. **Admin Authentication** - Secure code-based login via email

## Student Authentication

### Student Registration
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "year": "2024"
}
```

**Response (Success):**
```json
{
  "token": "jwt_token_here",
  "id": 123
}
```

### Student Login
**Endpoint:** `POST /api/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (Success):**
```json
{
  "message": "Login successful",
  "role": "student",
  "redirect": "/dashboards/students.html",
  "userId": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

## Admin Authentication

Admin authentication uses a secure code-based flow with email verification. This is more secure than password-based authentication for administrative access.

### Step 1: Request Admin Code
**Endpoint:** `POST /api/admins/register-code`

**Request Body:**
```json
{
  "name": "Jane Admin",
  "email": "jane@admin.com",
  "regNumber": "ADM2024001",
  "year": 2024
}
```

**What happens:**
1. System creates or updates admin record in database
2. Generates a 6-digit numeric code
3. Code is hashed and stored in `admin_codes` table
4. Code is emailed to the admin's email address
5. Code expires after 15 minutes
6. Maximum 5 codes can be requested per hour

**Response (Success):**
```json
{
  "message": "Admin code sent to email"
}
```

**Security Features:**
- Codes expire after 15 minutes
- Maximum 5 attempts per code
- Rate limited to 5 codes per hour
- Codes are stored hashed (not plain text)

### Step 2: Login with Code
**Endpoint:** `POST /api/admins/login-code`

**Request Body:**
```json
{
  "regNumber": "ADM2024001",
  "name": "Jane Admin",
  "adminCode": "123456"
}
```

**Response (Success):**
```json
{
  "role": "admin",
  "userId": 456,
  "name": "Jane Admin",
  "email": "jane@admin.com",
  "redirect": "admin.html"
}
```

**Error Responses:**
- `404` - Admin not found
- `401` - Invalid name
- `401` - Code expired, already used, or invalid
- `429` - Too many attempts

## Removed Endpoints

The following endpoints have been removed to consolidate authentication:

### Removed Admin Endpoints
- ❌ `POST /api/admins/register` - Old password-based registration
- ❌ `POST /api/admins/login` - Old password-based login
- ❌ `POST /api/auth/admin/register` - Conflicting code-based flow
- ❌ `POST /api/auth/admin/login-code` - Conflicting code-based flow

## Database Schema

### Students Table
```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  year TEXT,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Admins Table
```sql
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  admin_code TEXT UNIQUE,
  reg_number TEXT UNIQUE,
  year INTEGER
);
```

### Admin Codes Table
```sql
CREATE TABLE admin_codes (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  attempts_left INTEGER NOT NULL DEFAULT 5,
  used_at TIMESTAMP
);
```

## Error Logging

All authentication endpoints include comprehensive error logging for debugging:

- **Student Login:** Logs all login attempts, successes, and failures
- **Student Registration:** Logs registration attempts and errors
- **Admin Code Request:** Logs code generation and email sending
- **Admin Login:** Logs authentication attempts and validation failures
- **Database Errors:** Detailed error codes and messages
- **CORS Errors:** Origin blocking with helpful allowed origins list

## CORS Configuration

The backend allows requests from:
- `https://wonganijiya55-arch.github.io` (Production)
- `http://127.0.0.1:5501` (Local development)
- `http://localhost:5501` (Local development)
- `https://back-end-3-agho.onrender.com` (Render backend)
- `https://back-end-5-t3cv.onrender.com` (Render backend)

CORS errors include helpful messages showing which origins are allowed.

## Environment Variables

Required environment variables:

```bash
# Database Configuration (choose one based on environment)
DATABASE_URL=postgresql://user:pass@host/db
DATABASE_URL_INTERNAL=postgresql://user:pass@internal-host/db  # Render internal
DATABASE_URL_EXTERNAL=postgresql://user:pass@external-host/db  # Render external

# Authentication
JWT_SECRET_KEY=your_secret_key_here

# Email Configuration (for admin codes)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Or SMTP Configuration
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email
MAIL_PASSWORD=your_password
MAIL_FROM=noreply@example.com
```

## Testing

### Test Student Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test@example.com","password":"test123","year":"2024"}'
```

### Test Student Login
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Admin Code Request
```bash
curl -X POST http://localhost:5000/api/admins/register-code \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Admin","email":"admin@example.com","regNumber":"ADM001","year":2024}'
```

### Test Admin Login
```bash
curl -X POST http://localhost:5000/api/admins/login-code \
  -H "Content-Type: application/json" \
  -d '{"regNumber":"ADM001","name":"Test Admin","adminCode":"123456"}'
```

## Troubleshooting

### Student Login Fails on Server

1. **Check CORS:** Ensure frontend origin is in allowed list
2. **Check Database:** Verify DATABASE_URL is correct for Render
3. **Check Logs:** Look for detailed error messages in server logs
4. **Check Environment:** Ensure all required env vars are set

### Admin Code Not Received

1. **Check Email Config:** Verify EMAIL_USER and EMAIL_PASSWORD
2. **Check Spam Folder:** Code emails might be filtered
3. **Check Logs:** Look for email sending errors
4. **Dev Mode:** Set `DEV_CODE_LOG=true` to log codes to console

### Database Connection Issues

The server logs will show:
- Which DATABASE_URL is being used
- Exact error code (ENOTFOUND, ECONNREFUSED, etc.)
- Helpful troubleshooting tips
- Environment configuration status

Look for messages like:
```
❌ Failed to connect to the database via pg Pool
🔴 Error code: ENOTFOUND
💡 Database host not found. Check your DATABASE_URL setting.
```
