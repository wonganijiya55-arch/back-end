const express = require("express");
const { sendEmail } = require("../utils/sendEmail.js");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/database");

const router = express.Router();

// In-memory store for OTPs (for production, use Redis or database table)
const otpStore = new Map(); // Format: { email: { otp, expiry, attempts, resetToken } }

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request OTP for password reset
router.post("/request-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if user exists in students table
    db.get("SELECT * FROM students WHERE email = ?", [email], async (err, student) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      let userExists = false;
      let userType = null;

      if (student) {
        userExists = true;
        userType = "student";
      } else {
        // Check admin table
        db.get("SELECT * FROM admins WHERE email = ?", [email], async (err2, admin) => {
          if (err2) {
            console.error("Database error:", err2);
            return res.status(500).json({ message: "Database error" });
          }

          if (admin) {
            userExists = true;
            userType = "admin";
          }

          if (!userExists) {
            // Security: Don't reveal if email exists or not
            return res.json({ 
              message: "If the email is registered, an OTP has been sent to your email address" 
            });
          }

          await sendOTP(email, userType, res);
        });
        return;
      }

      await sendOTP(email, userType, res);
    });
  } catch (error) {
    console.error("Error in request-otp:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

async function sendOTP(email, userType, res) {
  try {
    // Generate OTP
    const otp = generateOTP();
    const expiry = Date.now() + 600000; // 10 minutes from now
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store OTP
    otpStore.set(email, {
      otp,
      expiry,
      attempts: 0,
      resetToken,
      userType,
      verified: false
    });

    // Send email with OTP
    const emailText = `Hello,

You requested to reset your password for your ICES account.

Your OTP (One-Time Password) is: ${otp}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email and ensure your account is secure.

Best regards,
ICES Support Team`;

    await sendEmail(email, "Password Reset OTP - ICES", emailText);

    res.json({ 
      message: "OTP has been sent to your email address. Please check your inbox.",
      expiresIn: 600 // seconds
    });

    // Cleanup old OTPs (older than 15 minutes)
    setTimeout(() => {
      const now = Date.now();
      for (const [key, value] of otpStore.entries()) {
        if (now > value.expiry + 300000) { // 5 minutes after expiry
          otpStore.delete(key);
        }
      }
    }, 1000);

  } catch (emailError) {
    console.error("Email error:", emailError);
    return res.status(500).json({ message: "Failed to send OTP email. Please try again later." });
  }
}

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const otpData = otpStore.get(email);

    if (!otpData) {
      return res.status(400).json({ message: "No OTP request found for this email. Please request a new OTP." });
    }

    // Check if OTP expired
    if (Date.now() > otpData.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Check attempts (max 5 attempts)
    if (otpData.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ message: "Too many failed attempts. Please request a new OTP." });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts++;
      otpStore.set(email, otpData);
      const remainingAttempts = 5 - otpData.attempts;
      return res.status(400).json({ 
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
      });
    }

    // OTP is valid
    otpData.verified = true;
    otpStore.set(email, otpData);

    res.json({ 
      message: "OTP verified successfully",
      resetToken: otpData.resetToken
    });

  } catch (error) {
    console.error("Error in verify-otp:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset password with verified token
router.post("/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: "Reset token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  try {
    // Find the email associated with this reset token
    let targetEmail = null;
    let otpData = null;

    for (const [email, data] of otpStore.entries()) {
      if (data.resetToken === resetToken) {
        targetEmail = email;
        otpData = data;
        break;
      }
    }

    if (!targetEmail || !otpData) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Check if OTP was verified
    if (!otpData.verified) {
      return res.status(400).json({ message: "OTP not verified. Please verify OTP first." });
    }

    // Check if token expired
    if (Date.now() > otpData.expiry) {
      otpStore.delete(targetEmail);
      return res.status(400).json({ message: "Reset session has expired. Please start over." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in appropriate table
    const tableName = otpData.userType === "student" ? "students" : "admins";
    
    db.run(
      `UPDATE ${tableName} SET password = ? WHERE email = ?`,
      [hashedPassword, targetEmail],
      function(err) {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Failed to update password" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        // Delete used OTP
        otpStore.delete(targetEmail);

        // Send confirmation email
        sendEmail(
          targetEmail,
          "Password Reset Successful - ICES",
          `Hello,

Your password has been successfully reset.

If you did not perform this action, please contact support immediately.

Best regards,
ICES Support Team`
        ).catch(err => console.error("Failed to send confirmation email:", err));

        res.json({ 
          message: "Password successfully reset. You can now login with your new password."
        });
      }
    );
  } catch (error) {
    console.error("Error in reset-password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Cleanup expired OTPs periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiry + 300000) { // 5 minutes after expiry
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  }
}, 300000);

module.exports = router;
