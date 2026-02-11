import { normalizeText } from '../../packages/shared/signing.mjs';

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeAuthorField(value) {
  if (typeof value !== 'string') return '';
  return normalizeText(value);
}

export function validateAuthor(author) {
  const errors = [];
  if (author === undefined || author === null) return errors;
  if (typeof author !== 'object') {
    errors.push('Invalid author profile');
    return errors;
  }

  if (author.name && (typeof author.name !== 'string' || author.name.length > 80)) {
    errors.push('Invalid author name');
  }
  if (author.handle && (typeof author.handle !== 'string' || author.handle.length > 40)) {
    errors.push('Invalid author handle');
  }
  if (author.url) {
    if (typeof author.url !== 'string' || author.url.length > 200 || !isValidUrl(author.url)) {
      errors.push('Invalid author url');
    }
  }
  if (author.bio && (typeof author.bio !== 'string' || author.bio.length > 280)) {
    errors.push('Invalid author bio');
  }

  return errors;
}

export function sanitizeAuthor(author) {
  if (!author || typeof author !== 'object') return null;
  const normalized = {
    name: normalizeAuthorField(author.name).slice(0, 80),
    handle: normalizeAuthorField(author.handle).slice(0, 40),
    url: normalizeAuthorField(author.url).slice(0, 200),
    bio: normalizeAuthorField(author.bio).slice(0, 280)
  };

  const hasValue = Object.values(normalized).some((value) => value);
  return hasValue ? normalized : null;
}

export async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
