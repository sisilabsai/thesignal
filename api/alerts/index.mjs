import { randomUUID } from 'node:crypto';
import { applyCors } from '../_lib/cors.mjs';
import { checkRateLimit, RATE_LIMIT } from '../_lib/rateLimit.mjs';
import { parseJsonBody, getClientKey, sendJson, normalizeAuthorField } from '../_lib/utils.mjs';
import { getAlerts, setAlerts } from '../_lib/store.mjs';
import { sendMail, mailConfigured } from '../_lib/mailer.mjs';

const ALLOWED_FREQUENCIES = new Set(['daily', 'weekly']);

function validateAlert(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') errors.push('Payload must be an object');
  if (!payload.email || !payload.email.includes('@')) errors.push('Invalid email');
  if (!payload.query || payload.query.length > 200) errors.push('Invalid query');
  if (!payload.frequency || !ALLOWED_FREQUENCIES.has(payload.frequency)) {
    errors.push('Invalid frequency');
  }
  return errors;
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const rate = checkRateLimit(getClientKey(req));
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.limit);
  res.setHeader('X-RateLimit-Remaining', rate.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(rate.resetAt).toISOString());
  if (!rate.allowed) {
    sendJson(res, 429, { error: 'Rate limit exceeded', resetAt: new Date(rate.resetAt).toISOString() });
    return;
  }

  const payload = await parseJsonBody(req);
  const errors = validateAlert(payload);
  if (errors.length) {
    sendJson(res, 400, { error: 'Validation failed', details: errors });
    return;
  }

  const alerts = await getAlerts();
  const alert = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    email: normalizeAuthorField(payload.email).slice(0, 200),
    query: normalizeAuthorField(payload.query).slice(0, 200),
    frequency: payload.frequency,
    lastSentAt: null,
    active: true
  };

  alerts.push(alert);
  await setAlerts(alerts);

  if (mailConfigured()) {
    const subject = `Signal alert created: ${alert.query}`;
    const text = [
      `Your alert is set for: ${alert.query}`,
      `Frequency: ${alert.frequency}`,
      `We will email you when new verified items match.`
    ].join('\n');
    await sendMail({ to: alert.email, subject, text });
  }

  sendJson(res, 200, { ok: true, id: alert.id });
}
