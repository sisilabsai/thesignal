import { scryptSync, timingSafeEqual } from 'node:crypto';
import { sendJson } from './utils.mjs';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.SIGNAL_ADMIN_TOKEN || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getHeaderToken(req) {
  const header = req.headers['x-admin-token'] || req.headers.authorization;
  if (!header) return '';
  const raw = Array.isArray(header) ? header[0] : String(header);
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
}

export function getAdminToken() {
  return ADMIN_TOKEN;
}

export function requireAdmin(req, res) {
  if (!ADMIN_TOKEN) {
    sendJson(res, 500, { error: 'Admin token not configured' });
    return false;
  }
  const token = getHeaderToken(req);
  if (!token || token !== ADMIN_TOKEN) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function verifyAdminCredentials(email, password) {
  if (!email || !password || !ADMIN_EMAIL) return false;
  if (email.toLowerCase() !== ADMIN_EMAIL) return false;

  if (ADMIN_PASSWORD_HASH && ADMIN_PASSWORD_SALT) {
    const hash = scryptSync(password, ADMIN_PASSWORD_SALT, 64).toString('hex');
    return safeEqual(hash, ADMIN_PASSWORD_HASH);
  }

  if (ADMIN_PASSWORD) {
    return safeEqual(password, ADMIN_PASSWORD);
  }

  return false;
}
