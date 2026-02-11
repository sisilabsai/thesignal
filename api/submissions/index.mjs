import { randomUUID } from 'node:crypto';
import { applyCors } from '../_lib/cors.mjs';
import { checkRateLimit, RATE_LIMIT } from '../_lib/rateLimit.mjs';
import { parseJsonBody, getClientKey, sendJson, isValidUrl, normalizeAuthorField } from '../_lib/utils.mjs';
import { addSubmission } from '../_lib/store.mjs';
import { sendMail, mailConfigured } from '../_lib/mailer.mjs';
import { captchaRequired, verifyCaptcha } from '../_lib/captcha.mjs';

function validateSubmission(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') errors.push('Payload must be an object');
  if (payload.company) errors.push('Spam detected');
  if (!payload.name || payload.name.length > 120) errors.push('Invalid name');
  if (!payload.url || !isValidUrl(payload.url)) errors.push('Invalid url');
  if (!payload.contactEmail || !payload.contactEmail.includes('@')) errors.push('Invalid contact email');
  if (payload.sampleUrl && !isValidUrl(payload.sampleUrl)) errors.push('Invalid sample URL');
  if (payload.notes && payload.notes.length > 2000) errors.push('Notes too long');
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
  const errors = validateSubmission(payload);
  if (errors.length) {
    sendJson(res, 400, { error: 'Validation failed', details: errors });
    return;
  }

  if (payload.startedAt) {
    const startedAt = new Date(payload.startedAt);
    if (!Number.isNaN(startedAt.getTime())) {
      const elapsed = Date.now() - startedAt.getTime();
      if (elapsed < 3000) {
        sendJson(res, 400, { error: 'Form submitted too quickly' });
        return;
      }
    }
  }

  if (captchaRequired()) {
    const captcha = await verifyCaptcha(payload.captchaToken, getClientKey(req));
    if (!captcha.ok) {
      sendJson(res, 400, { error: captcha.error || 'Captcha failed' });
      return;
    }
  }

  const submission = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    name: normalizeAuthorField(payload.name).slice(0, 120),
    url: normalizeAuthorField(payload.url).slice(0, 300),
    contactEmail: normalizeAuthorField(payload.contactEmail).slice(0, 200),
    sampleUrl: normalizeAuthorField(payload.sampleUrl || '').slice(0, 300),
    category: normalizeAuthorField(payload.category || '').slice(0, 120),
    notes: normalizeAuthorField(payload.notes || '').slice(0, 2000)
  };

  await addSubmission(submission);

  const notifyEmail = process.env.SUBMISSIONS_NOTIFY || process.env.SMTP_USER;
  if (notifyEmail && mailConfigured()) {
    const subject = `New Signal submission: ${submission.name}`;
    const text = [
      `Name: ${submission.name}`,
      `URL: ${submission.url}`,
      `Contact: ${submission.contactEmail}`,
      `Sample: ${submission.sampleUrl || 'N/A'}`,
      `Category: ${submission.category || 'N/A'}`,
      `Notes: ${submission.notes || 'N/A'}`
    ].join('\n');
    await sendMail({ to: notifyEmail, subject, text });
  }

  sendJson(res, 200, { ok: true, id: submission.id });
}
