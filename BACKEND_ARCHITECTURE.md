# Backend Architecture Documentation

## Technology Stack

### Core Technologies
- **Runtime**: Node.js
- **Framework**: Express.js v5.1.0
- **Database**: PostgreSQL (via pg v8.16.3)
- **Authentication**: JWT (jsonwebtoken v9.0.2)
- **Password Hashing**: bcrypt v6.0.0
- **Email**: nodemailer v7.0.10
- **Validation**: express-validator v7.3.0
- **Environment**: dotenv v17.2.3
- **CORS**: cors v2.8.5

### Development Tools
- **Dev Server**: nodemon v3.1.10

## Project Structure

```
back-end/
├── config/
│   └── database.js          # PostgreSQL connection pool and DB initialization
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   └── init.js              # Database startup initialization
├── routes/
│   ├── admin.js             # Admin authentication and management endpoints
│   ├── auth.js              # Student registration endpoint
│   ├── login.js             # Unified login endpoint
│   ├── events.js            # Public event endpoints
│   ├── payments.js          # Payment endpoints
│   ├── students.js          # Student endpoints
│   └── passwordResetOTP.js  # Password reset functionality
├── server/
│   ├── app.js               # Express app configuration
│   ├── cors.js              # CORS configuration
│   ├── errors.js            # Error handling middleware
│   └── start.js             # Server startup script
├── utils/
│   ├── hash.js              # Password hashing utilities
│   └── sendEmail.js         # Email sending utilities
├── scripts/
│   └── db-check.js          # Database health check script
└── server.js                # Main server entry point
```

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
  reg_number TEXT UNIQUE,
  year INTEGER
);
```

### Events Table
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  purpose TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Event Registrations Table
```sql
CREATE TABLE event_registrations (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  event_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Admin Codes Table (for OTP-based admin access)
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

## API Endpoints

### Authentication Endpoints

#### Student Registration
**POST** `/api/auth/register`

Request:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "year": "2024"
}
```

Response (201):
```json
{
  "success": true,
  "role": "student",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Unified Login
**POST** `/api/login`

Request:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response (200) - Student:
```json
{
  "message": "Login successful",
  "role": "student",
  "redirect": "/docs/students.html",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

Response (200) - Admin:
```json
{
  "message": "Login successful",
  "role": "admin",
  "redirect": "/docs/admin.html",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 1,
  "name": "Admin User",
  "email": "admin@example.com"
}
```

#### Admin Registration
**POST** `/api/admins/register`

Request:
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword"
}
```

Response (201):
```json
{
  "success": true,
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

#### Admin Login
**POST** `/api/admins/login`

Request:
```json
{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

Response (200):
```json
{
  "success": true,
  "role": "admin",
  "redirect": "/docs/admin.html",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

### Protected Admin Endpoints

**All admin endpoints require:**
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Token must contain `role: "admin"`

#### List All Students
**GET** `/api/admins/students`

Response (200):
```json
{
  "success": true,
  "students": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "year": "2024",
      "registration_date": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Student by ID
**GET** `/api/admins/students/:id`

Response (200):
```json
{
  "success": true,
  "student": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "year": "2024",
    "registration_date": "2024-01-01T00:00:00.000Z"
  }
}
```

#### List All Payments
**GET** `/api/admins/payments`

Response (200):
```json
{
  "success": true,
  "payments": [
    {
      "id": 1,
      "student_id": 1,
      "purpose": "Membership Fee",
      "amount": 5000,
      "method": "bank_transfer",
      "date": "2024-01-01T00:00:00.000Z",
      "student_name": "John Doe",
      "student_email": "john@example.com"
    }
  ]
}
```

#### Get Payment by ID
**GET** `/api/admins/payments/:id`

Response (200):
```json
{
  "success": true,
  "payment": {
    "id": 1,
    "student_id": 1,
    "purpose": "Membership Fee",
    "amount": 5000,
    "method": "bank_transfer",
    "date": "2024-01-01T00:00:00.000Z",
    "student_name": "John Doe",
    "student_email": "john@example.com"
  }
}
```

#### List All Events
**GET** `/api/admins/events`

Response (200):
```json
{
  "success": true,
  "events": [
    {
      "id": 1,
      "title": "Annual Conference",
      "description": "Our yearly conference",
      "event_date": "2024-06-15"
    }
  ]
}
```

#### Create Event
**POST** `/api/admins/events`

Request:
```json
{
  "title": "Annual Conference",
  "description": "Our yearly conference",
  "event_date": "2024-06-15"
}
```

Response (201):
```json
{
  "success": true,
  "message": "Event created successfully",
  "event": {
    "id": 1,
    "title": "Annual Conference",
    "description": "Our yearly conference",
    "event_date": "2024-06-15"
  }
}
```

#### Update Event
**PUT** `/api/admins/events/:id`

Request:
```json
{
  "title": "Annual Conference 2024",
  "description": "Updated description",
  "event_date": "2024-06-20"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Event updated successfully",
  "event": {
    "id": 1,
    "title": "Annual Conference 2024",
    "description": "Updated description",
    "event_date": "2024-06-20"
  }
}
```

#### Delete Event
**DELETE** `/api/admins/events/:id`

Response (200):
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

#### List All Event Registrations
**GET** `/api/admins/registrations`

Response (200):
```json
{
  "success": true,
  "registrations": [
    {
      "id": 1,
      "student_id": 1,
      "event_name": "Annual Conference",
      "created_at": "2024-01-01T00:00:00.000Z",
      "student_name": "John Doe",
      "student_email": "john@example.com"
    }
  ]
}
```

### Public Student Endpoints

#### List Students
**GET** `/api/students`

Response:
```json
{
  "students": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "year": "2024",
      "registration_date": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Student Login
**POST** `/api/students/login`

Request:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response (200):
```json
{
  "message": "Login successful",
  "studentId": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "year": "2024"
}
```

### Public Event Endpoints

#### List All Events
**GET** `/api/events`

Response:
```json
{
  "events": [
    {
      "id": 1,
      "title": "Annual Conference",
      "description": "Our yearly conference",
      "date": "2024-06-15"
    }
  ]
}
```

#### List Upcoming Events
**GET** `/api/events/upcoming`

Response:
```json
{
  "upcoming": [
    {
      "id": 1,
      "title": "Annual Conference",
      "description": "Our yearly conference",
      "date": "2024-06-15"
    }
  ]
}
```

#### Create Event (Public)
**POST** `/api/events`

Request:
```json
{
  "title": "Workshop",
  "description": "Technical workshop",
  "date": "2024-05-10"
}
```

Response (201):
```json
{
  "message": "Event created successfully",
  "eventId": 1
}
```

#### Register for Event
**POST** `/api/events/register`

Request:
```json
{
  "studentId": 1,
  "eventName": "Annual Conference"
}
```

Response (201):
```json
{
  "message": "Registration successful",
  "registrationId": 1,
  "studentId": 1,
  "eventName": "Annual Conference"
}
```

#### List Student's Registrations
**GET** `/api/events/registrations/:studentId`

Response:
```json
{
  "registrations": [
    {
      "id": 1,
      "student_id": 1,
      "event_name": "Annual Conference",
      "created_at": "2024-01-01T00:00:00.000Z",
      "student_name": "John Doe"
    }
  ]
}
```

### Payment Endpoints

#### List All Payments
**GET** `/api/payments`

Response:
```json
{
  "payments": [
    {
      "id": 1,
      "student_id": 1,
      "purpose": "Membership Fee",
      "amount": 5000,
      "method": "bank_transfer",
      "date": "2024-01-01T00:00:00.000Z",
      "student_name": "John Doe",
      "student_email": "john@example.com"
    }
  ]
}
```

#### Get Payment Summary
**GET** `/api/payments/summary`

Response:
```json
{
  "total": 50000,
  "count": 10
}
```

### Password Reset Endpoints

**POST** `/api/password-reset/request`

Request:
```json
{
  "email": "user@example.com"
}
```

**POST** `/api/password-reset/verify`

Request:
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

### Health Check Endpoints

**GET** `/` - Returns "Backend is running"

**GET** `/api/health` - Returns `{ "ok": true, "time": 1234567890 }`

**GET** `/api/students/health` - Returns `{ "ok": true }`

**GET** `/api/events/health` - Returns `{ "ok": true }`

**GET** `/api/payments/health` - Returns `{ "ok": true }`

## JWT Authentication Flow

### Token Generation
1. User registers or logs in with credentials
2. Server validates credentials against database
3. Server generates JWT token with payload:
   ```javascript
   {
     id: user.id,
     email: user.email,
     role: 'student' | 'admin'
   }
   ```
4. Token is signed with `JWT_SECRET_KEY` and expires in 7 days
5. Token is returned in response

### Token Validation
1. Client includes token in `Authorization` header: `Bearer <token>`
2. Protected endpoints use `verifyToken` middleware
3. Middleware extracts and verifies token
4. Decoded user data is attached to `req.user`
5. Role-specific middleware (`verifyAdmin`, `verifyStudent`) checks role
6. Request proceeds if valid, or returns 401/403 if invalid

### Token Usage Example
```javascript
// Client-side request
fetch('/api/admins/students', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
})
```

### Token Errors
- **403 Forbidden**: No token provided
- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Valid token but insufficient role permissions

## Security Features

### Authentication
- **Password Hashing**: bcrypt with salt rounds = 10
- **JWT Tokens**: HS256 algorithm, 7-day expiration
- **Token Secret**: Stored in `JWT_SECRET_KEY` environment variable

### Authorization
- **Role-Based Access Control (RBAC)**: Admin and Student roles
- **Protected Routes**: Admin endpoints require admin role
- **Middleware Chain**: verifyToken → verifyAdmin/verifyStudent

### Database Security
- **SSL Connections**: Required for PostgreSQL (rejectUnauthorized: false for Render)
- **Prepared Statements**: All queries use parameterized queries to prevent SQL injection
- **Unique Constraints**: Email fields are unique to prevent duplicates

### Input Validation
- **express-validator**: Used for request validation
- **Required Fields**: Validated before processing
- **Email Format**: Validated for proper email structure
- **Password Length**: Minimum 6 characters for student registration

### Error Handling
- **Sanitized Errors**: Internal errors don't expose sensitive data
- **Consistent Format**: All errors return JSON with `success: false` and `error` message
- **Proper HTTP Status Codes**: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error)

## Environment Variables

### Required Variables

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_URL_INTERNAL=postgresql://user:password@internal-host:port/database  # Render internal
DATABASE_URL_EXTERNAL=postgresql://user:password@external-host:port/database  # External access

# SSL Mode (required by Render)
PGSSLMODE=require

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-here

# Email Configuration (for password reset)
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password

# Server Configuration
PORT=5000
RENDER=true  # Set automatically by Render platform
```

### Environment Setup

#### Local Development
1. Copy `.env.example` to `.env`
2. Fill in your local PostgreSQL credentials in `DATABASE_URL`
3. Generate a secure random string for `JWT_SECRET_KEY`
4. Configure email credentials for password reset functionality

#### Production (Render)
1. Set environment variables in Render dashboard
2. Use `DATABASE_URL_INTERNAL` for internal connections (faster)
3. Ensure `RENDER=true` is set (automatic on Render)
4. Use strong, randomly generated `JWT_SECRET_KEY`

## Deployment Information

### Render Deployment

The application is configured for deployment on Render.com:

1. **Database Selection**: 
   - Prefers `DATABASE_URL_INTERNAL` when `RENDER=true`
   - Falls back to `DATABASE_URL_EXTERNAL` or `DATABASE_URL`

2. **SSL Configuration**: 
   - SSL required for PostgreSQL connections
   - `rejectUnauthorized: false` for Render compatibility

3. **Startup Process**:
   - Database connection tested on startup
   - Tables created automatically if they don't exist
   - Server starts only after successful DB initialization

4. **Build Command**: `npm install`

5. **Start Command**: `npm start` (runs `node server/start.js`)

### Database Initialization

On first run, the application automatically creates all required tables:
- students
- admins
- events
- payments
- event_registrations
- admin_codes

### CORS Configuration

CORS is configured in `server/cors.js` to allow requests from:
- Production frontend domain
- Local development origins
- GitHub Pages deployment

### Error Handling

Database errors are mapped to helpful messages:
- `ENOTFOUND`: Database host not found
- `ECONNREFUSED`: Connection refused
- `28P01`: Authentication failed
- `3D000`: Database does not exist
- `ETIMEDOUT`: Connection timeout
- `ECONNRESET`: Connection reset

### Monitoring

Health check endpoints available at:
- `/api/health` - Main health check
- `/api/students/health` - Student routes health
- `/api/events/health` - Event routes health
- `/api/payments/health` - Payment routes health

### Logging

All routes log errors with descriptive prefixes:
- `[STUDENT REGISTER]`
- `[ADMIN LOGIN ERROR]`
- `[ADMIN GET STUDENTS ERROR]`
- etc.

## Development

### Setup
```bash
npm install
```

### Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Run Development Server
```bash
npm run dev
```

### Run Production Server
```bash
npm start
```

### Database Health Check
```bash
npm run db:check
```

### Testing
No automated tests currently configured. Manual testing recommended for:
- Authentication flows
- Protected endpoint access
- Error handling
- Database operations

## API Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### List Response
```json
{
  "success": true,
  "items": [ /* array of items */ ]
}
```

## Common HTTP Status Codes

- **200 OK**: Successful GET, PUT, DELETE
- **201 Created**: Successful POST creating new resource
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Valid token but insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Database or server error
