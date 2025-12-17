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

// Build a list of candidate transport configs to improve deliverability
function buildTransportCandidates() {
  const tlsTrust = String(process.env.MAIL_TRUST_TLS || 'false').toLowerCase() === 'true';
  const tlsOpts = tlsTrust ? { tls: { rejectUnauthorized: false } } : {};
  const timeouts = {
    connectionTimeout: parseInt(process.env.MAIL_CONN_TIMEOUT_MS || '7000', 10),
    socketTimeout: parseInt(process.env.MAIL_SOCKET_TIMEOUT_MS || '7000', 10),
    greetingTimeout: parseInt(process.env.MAIL_GREETING_TIMEOUT_MS || '7000', 10),
    dnsTimeout: parseInt(process.env.MAIL_DNS_TIMEOUT_MS || '4000', 10),
  };

  if (process.env.MAIL_HOST) {
    const host = process.env.MAIL_HOST;
    const port = parseInt(process.env.MAIL_PORT || '587', 10);
    const secure = String(process.env.MAIL_SECURE || (port === 465 ? 'true' : 'false')).toLowerCase() === 'true';
    const base = {
      host,
      port,
      secure,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
      ...tlsOpts,
      ...timeouts,
    };
    const candidates = [base];
    // Alternate common ports/configs
    if (!(port === 465 && secure === true)) {
      candidates.push({ host, port: 465, secure: true, auth: base.auth, ...tlsOpts, ...timeouts });
    }
    if (!(port === 587 && secure === false)) {
      candidates.push({ host, port: 587, secure: false, requireTLS: true, auth: base.auth, ...tlsOpts, ...timeouts });
    }
    return candidates;
  }

  // Gmail fallback candidates
  const gmailAuth = { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD };
  return [
    { service: 'gmail', auth: gmailAuth, ...tlsOpts, ...timeouts },
    { host: 'smtp.gmail.com', port: 465, secure: true, auth: gmailAuth, ...tlsOpts, ...timeouts },
    { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: gmailAuth, ...tlsOpts, ...timeouts },
  ];
}

// Send email; supports plaintext and optional HTML. Tries fallback transport configs on ETIMEDOUT/connection failures.
const sendEmail = async (to, subject, text, html) => {
  const from = process.env.MAIL_FROM || (process.env.EMAIL_USER ? `"ICES Support" <${process.env.EMAIL_USER}>` : undefined);
  const candidates = buildTransportCandidates();
  let lastError;
  for (const cfg of candidates) {
    try {
      const transporter = nodemailer.createTransport(cfg);
      await transporter.sendMail({ from, to, subject, text, html });
      console.log('✅ Email sent successfully via', cfg.service || `${cfg.host}:${cfg.port}${cfg.secure ? '(secure)' : ''}`);
      return { success: true };
    } catch (error) {
      lastError = error;
      const reason = error && error.message ? error.message : String(error);
      console.warn('⚠️  Email send attempt failed via', cfg.service || `${cfg.host}:${cfg.port}`, '-', reason);
      // Try next candidate on connection issues
      continue;
    }
  }
  console.error('❌ Email sending failed after fallbacks:', lastError);
  throw new Error(`Failed to send email: ${lastError?.message || String(lastError)}`);
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
