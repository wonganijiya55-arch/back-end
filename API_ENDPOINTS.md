# API Endpoints Quick Reference

This is a quick reference for all available authentication endpoints in the ICES backend.

## 🎯 Recommended Authentication Endpoints

### Student Authentication
| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `/api/auth/register` | POST | Register new student | `{ token, id }` (with JWT) |
| `/api/login` | POST | Student login | `{ message, role, redirect, userId, name, email }` |

**Why recommended:** These endpoints return JWT tokens and complete user information including role and redirect URLs.

### Admin Authentication
| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `/api/admins/register-code` | POST | Request admin code via email | `{ message }` |
| `/api/admins/login-code` | POST | Login with received code | `{ role, userId, name, email, redirect }` |

**Why recommended:** Secure code-based authentication with email verification.

---

## 📋 All Available Endpoints

### Student Authentication (Multiple Options)

#### Option 1: With JWT Token (Recommended)
```bash
# Register
POST /api/auth/register
Body: { name, email, password, year }
Returns: { token, id }

# Login
POST /api/login
Body: { email, password }
Returns: { message, role, redirect, userId, name, email }
```

#### Option 2: Without JWT Token (Legacy)
```bash
# Register
POST /api/students/register
Body: { name, email, password, year }
Returns: { message, studentId }

# Login
POST /api/students/login
Body: { email, password }
Returns: { message, studentId, name, email, year }
```

### Admin Authentication

#### Code-Based Flow (Secure)
```bash
# Step 1: Request Code
POST /api/admins/register-code
Body: { name, email, regNumber, year }
Returns: { message }
# System emails 6-digit code (expires in 15 minutes)

# Step 2: Login with Code
POST /api/admins/login-code
Body: { regNumber, name, adminCode }
Returns: { role, userId, name, email, redirect }
```

### Admin Management
```bash
GET /api/admins
# Returns list of all admins

GET /api/admins/students
# Returns list of all students (admin view)

GET /api/admins/students/:id
# Returns specific student details

GET /api/admins/events
# Returns list of events (admin view)

GET /api/admins/registrations
# Returns all event registrations

GET /api/admins/payments
# Returns all payments

GET /api/admins/payments/:id
# Returns specific payment details
```

### Student Management
```bash
GET /api/students
# Returns list of all students

GET /api/students/health
# Health check endpoint
```

### Events
```bash
GET /api/events
# List all events

POST /api/events
# Create new event

POST /api/events/register
# Register for an event
```

### Payments
```bash
GET /api/payments
# List all payments

GET /api/payments/summary
# Get payment aggregates
```

### Password Reset
```bash
POST /api/password-reset/request-otp
# Request OTP for password reset

POST /api/password-reset/verify-otp
# Verify OTP

POST /api/password-reset/reset-password
# Reset password with verified OTP
```

---

## 🔧 Request/Response Examples

### Student Registration (Recommended)
**Request:**
```json
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePass123",
  "year": "2024"
}
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": 123
}
```

**Response (Error - Email exists):**
```json
{
  "error": "Email already registered"
}
```

### Student Login (Recommended)
**Request:**
```json
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePass123"
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

**Response (Error - Not found):**
```json
{
  "error": "User not found"
}
```

**Response (Error - Wrong password):**
```json
{
  "error": "Invalid password"
}
```

### Admin Registration Request
**Request:**
```json
POST /api/admins/register-code
Content-Type: application/json

{
  "name": "Jane Admin",
  "email": "jane@admin.com",
  "regNumber": "ADM2024001",
  "year": 2024
}
```

**Response (Success):**
```json
{
  "message": "Admin code sent to email"
}
```

**Response (Error - Rate limited):**
```json
{
  "message": "Rate limited. Try again later."
}
```

### Admin Login with Code
**Request:**
```json
POST /api/admins/login-code
Content-Type: application/json

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

**Response (Error - Invalid code):**
```json
{
  "message": "Invalid code"
}
```

**Response (Error - Code expired):**
```json
{
  "message": "Code expired. Request a new code."
}
```

---

## ⚠️ Common Issues

### Issue: "Still getting errors logging in and registering"

**Root Cause:** Multiple endpoints with different response formats causing confusion.

**Solution:**
1. **Standardize on recommended endpoints:**
   - Use `/api/auth/register` for student registration
   - Use `/api/login` for student login

2. **Update frontend to handle correct response format:**
   - `/api/auth/register` returns `{ token, id }` - save token for authentication
   - `/api/login` returns `{ role, redirect, userId, name, email }` - use for navigation

3. **Check server logs** for detailed error messages with `[STUDENT LOGIN]` or `[STUDENT REGISTER]` prefixes

### Issue: CORS Error

**Solution:** Verify your frontend origin is in the allowed list:
- `https://wonganijiya55-arch.github.io`
- `http://127.0.0.1:5501`
- `http://localhost:5501`

### Issue: Database Connection Error

**Solution:** 
1. Check `DATABASE_URL_INTERNAL` (on Render) or `DATABASE_URL_EXTERNAL` (locally) is set
2. Verify database is accessible
3. Check server logs for detailed connection error messages

---

## 📚 Full Documentation

For more detailed information, see:
- [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) - Complete authentication flows
- [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) - Recent changes and migration guide
- [README.md](./README.md) - Setup and configuration
