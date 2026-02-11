import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true') === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'no-reply@thesignal.local';

let transporter = null;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return transporter;
}

export function mailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export async function sendMail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) {
    return { ok: false, error: 'SMTP not configured' };
  }

  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html
  });

  return { ok: true };
}
