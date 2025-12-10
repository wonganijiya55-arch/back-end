# OTP-Based Password Reset System - Complete Guide

## Overview
This system implements a secure 3-step OTP (One-Time Password) based password reset flow with email verification.

## Features

### Security Features
✅ **6-Digit OTP**: Random numeric code for verification  
✅ **10-Minute Expiry**: OTPs automatically expire after 10 minutes  
✅ **Rate Limiting**: Maximum 5 verification attempts per OTP  
✅ **Automatic Cleanup**: Expired OTPs are automatically removed  
✅ **No Email Enumeration**: Doesn't reveal if email exists in database  
✅ **Token-Based**: Reset token required after OTP verification  
✅ **Password Hashing**: Uses bcrypt for secure password storage  

### User Experience Features
✅ **Visual Step Indicator**: Shows progress through 3 steps  
✅ **Auto-Focus**: Automatically moves between OTP input fields  
✅ **Paste Support**: Can paste 6-digit OTP code  
✅ **Resend OTP**: 60-second cooldown timer  
✅ **Password Requirements**: Real-time validation feedback  
✅ **Loading States**: Visual feedback during API calls  
✅ **Error Messages**: Clear, actionable error messages  

## Flow Diagram

```
Step 1: Enter Email
    ↓
  [Send OTP Button]
    ↓
  Backend generates 6-digit OTP
  Stores OTP with 10-min expiry
  Sends email with OTP
    ↓
Step 2: Verify OTP
    ↓
  User enters 6-digit code
  [Verify OTP Button]
    ↓
  Backend validates OTP
  Returns reset token
    ↓
Step 3: New Password
    ↓
  User enters new password
  [Reset Password Button]
    ↓
  Backend updates password
  Sends confirmation email
    ↓
  Redirect to Login
```

## API Endpoints

### 1. Request OTP
**Endpoint:** `POST /api/password-reset/request-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "OTP has been sent to your email address. Please check your inbox.",
  "expiresIn": 600
}
```

**Error Responses:**
- `400`: Missing email
- `500`: Server/email sending error

---

### 2. Verify OTP
**Endpoint:** `POST /api/password-reset/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "message": "OTP verified successfully",
  "resetToken": "a1b2c3d4e5f6..."
}
```

**Error Responses:**
- `400`: Invalid OTP, expired OTP, or no OTP request found
- `429`: Too many failed attempts

---

### 3. Reset Password
**Endpoint:** `POST /api/password-reset/reset-password`

**Request Body:**
```json
{
  "resetToken": "a1b2c3d4e5f6...",
  "newPassword": "NewSecurePassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Password successfully reset. You can now login with your new password."
}
```

**Error Responses:**
- `400`: Invalid token, unverified OTP, or password too short
- `404`: User not found
- `500`: Database error

## Email Templates

### OTP Email
```
Subject: Password Reset OTP - ICES

Hello,

You requested to reset your password for your ICES account.

Your OTP (One-Time Password) is: 123456

This code will expire in 10 minutes.

If you didn't request this, please ignore this email and ensure 
your account is secure.

Best regards,
ICES Support Team
```

### Confirmation Email
```
Subject: Password Reset Successful - ICES

Hello,

Your password has been successfully reset.

If you did not perform this action, please contact support immediately.

Best regards,
ICES Support Team
```

## Frontend Implementation

### File Location
`public/forgot-password.html`

### Key Features

#### Step Indicator
- Visual progress tracker
- Active step highlighted in blue
- Completed steps shown in green

#### OTP Input
- 6 individual input fields
- Auto-focus next field on input
- Backspace navigation
- Paste support for full OTP code

#### Password Validation
- Minimum 6 characters
- Uppercase letter check
- Lowercase letter check
- Number check
- Real-time visual feedback

#### Resend OTP
- 60-second cooldown timer
- Button disabled during cooldown
- Visual countdown display

## Testing Instructions

### Prerequisites
1. Ensure backend server is running: `npm start` or `node server.js`
2. Configure email credentials in `.env`:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```
3. Open `forgot-password.html` in browser

### Test Cases

#### Test 1: Valid Email Flow
1. Enter registered email
2. Click "Send OTP"
3. Check email inbox for OTP
4. Enter 6-digit OTP
5. Click "Verify OTP"
6. Enter new password (twice)
7. Click "Reset Password"
8. Verify redirect to login page

**Expected:** Success at each step

---

#### Test 2: Invalid Email
1. Enter unregistered email
2. Click "Send OTP"

**Expected:** Generic success message (security feature)

---

#### Test 3: Wrong OTP
1. Request OTP
2. Enter incorrect 6-digit code
3. Click "Verify OTP"

**Expected:** Error message with remaining attempts

---

#### Test 4: Expired OTP
1. Request OTP
2. Wait 11 minutes
3. Enter OTP

**Expected:** "OTP has expired" error

---

#### Test 5: Too Many Attempts
1. Request OTP
2. Enter wrong OTP 5 times

**Expected:** "Too many failed attempts" error

---

#### Test 6: Resend OTP
1. Request OTP
2. Wait for 60-second timer
3. Click "Resend OTP"
4. Check email for new OTP

**Expected:** New OTP sent, timer resets

---

#### Test 7: Password Mismatch
1. Complete OTP verification
2. Enter different passwords in both fields
3. Click "Reset Password"

**Expected:** "Passwords do not match" error

---

#### Test 8: Weak Password
1. Complete OTP verification
2. Enter password less than 6 characters
3. Click "Reset Password"

**Expected:** "Password must be at least 6 characters" error

## Database Support

### Tables Used
- `students` - For student accounts
- `admins` - For admin accounts

### Fields Updated
- `password` - Hashed password (bcrypt)

## Security Considerations

### ✅ Implemented
- OTP expiry (10 minutes)
- Rate limiting (5 attempts)
- Secure random OTP generation
- Token-based verification
- Password hashing (bcrypt)
- No email enumeration
- Automatic cleanup of expired OTPs
- HTTPS recommended for production

### ⚠️ Production Recommendations
1. **Use Redis** for OTP storage (instead of in-memory Map)
2. **Enable HTTPS** for secure transmission
3. **Add CAPTCHA** to prevent automated attacks
4. **IP Rate Limiting** to prevent abuse
5. **Email Rate Limiting** per email address
6. **SMS OTP** as backup option
7. **Account Lockout** after multiple reset attempts
8. **Audit Logging** for security monitoring

## Troubleshooting

### OTP Not Received
1. Check spam/junk folder
2. Verify EMAIL_USER and EMAIL_PASSWORD in `.env`
3. Enable "Less secure app access" for Gmail (or use App Password)
4. Check server console for email errors

### Invalid OTP Error
1. Ensure all 6 digits are entered
2. Check OTP hasn't expired (10 min limit)
3. Verify you're using the latest OTP if you clicked resend
4. Check for typos in OTP

### Database Errors
1. Verify database connection in `config/database.js`
2. Ensure tables exist (run migrations)
3. Check user exists in database

### Frontend Errors
1. Open browser console (F12)
2. Check API_URL points to correct backend
3. Verify CORS is enabled on backend
4. Check network tab for failed requests

## Code Structure

### Backend Files
```
backend/
├── routes/
│   └── passwordResetOTP.js    # OTP-based password reset routes
├── utils/
│   └── sendEmail.js           # Email sending utility
└── server.js                   # Route registration
```

### Frontend Files
```
public/
└── forgot-password.html        # Complete OTP flow UI
```

## Environment Variables

Required in `.env`:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
PORT=5000
FRONTEND_URL=http://localhost:5000
```

## Support

For issues or questions:
1. Check this guide
2. Review server console logs
3. Check browser console
4. Verify email configuration
5. Test with known registered email

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
