// Email sending utility using Nodemailer with SMTP or Gmail fallback
const nodemailer = require('nodemailer');

function createTransporterFromEnv() {
  const useSmtp = !!process.env.MAIL_HOST;
  if (useSmtp) {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  } else {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
}

// Send email; supports plaintext and optional HTML. Credentials come from env.
const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = createTransporterFromEnv();
    const from = process.env.MAIL_FROM || (process.env.EMAIL_USER ? `"ICES Support" <${process.env.EMAIL_USER}>` : undefined);
    await transporter.sendMail({ from, to, subject, text, html });
    console.log('✅ Email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

async function verifyEmailTransport() {
  const transporter = createTransporterFromEnv();
  try {
    const ok = await transporter.verify();
    const mode = process.env.MAIL_HOST ? 'smtp' : 'gmail';
    return { ok, mode, host: process.env.MAIL_HOST || 'gmail', port: process.env.MAIL_PORT || null };
  } catch (error) {
    return { ok: false, error: error.message, mode: process.env.MAIL_HOST ? 'smtp' : 'gmail' };
  }
}

module.exports = { sendEmail, createTransporterFromEnv, verifyEmailTransport };
