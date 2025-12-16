// Email sending utility using Nodemailer with SMTP or Gmail fallback
const nodemailer = require('nodemailer');

// Send email; supports plaintext and optional HTML. Credentials come from env.
const sendEmail = async (to, subject, text, html) => {
  try {
    const useSmtp = !!process.env.MAIL_HOST;
    const transporter = nodemailer.createTransport(
      useSmtp
        ? {
            host: process.env.MAIL_HOST,
            port: parseInt(process.env.MAIL_PORT || '587', 10),
            secure: String(process.env.MAIL_SECURE).toLowerCase() === 'true',
            auth: {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASSWORD,
            },
          }
        : {
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
          }
    );

    const from = process.env.MAIL_FROM || (process.env.EMAIL_USER ? `"ICES Support" <${process.env.EMAIL_USER}>` : undefined);
    await transporter.sendMail({ from, to, subject, text, html });

    console.log('✅ Email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = { sendEmail };
