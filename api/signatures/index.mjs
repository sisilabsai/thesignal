import * as ed from '@noble/ed25519';
import { randomUUID } from 'node:crypto';
import {
  SIGNING_VERSION,
  computeContentHash,
  canonicalMessage,
  messageBytes,
  base64ToBytes,
  fingerprintFromPublicKey,
  normalizeText
} from '../../packages/shared/signing.mjs';
import { applyCors } from '../_lib/cors.mjs';
import { RATE_LIMIT, checkRateLimit } from '../_lib/rateLimit.mjs';
import {
  parseJsonBody,
  getClientKey,
  isValidUrl,
  validateAuthor,
  sanitizeAuthor,
  sendJson
} from '../_lib/utils.mjs';
import { getRecords, setRecords } from '../_lib/store.mjs';

function validatePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') errors.push('Payload must be an object');
  if (payload.version !== SIGNING_VERSION) errors.push('Unsupported version');
  if (!payload.url || !isValidUrl(payload.url)) errors.push('Invalid url');
  if (!payload.title || payload.title.length > 200) errors.push('Invalid title');
  if (!payload.excerpt || payload.excerpt.length > 2000) errors.push('Invalid excerpt');
  if (!payload.createdAt || Number.isNaN(Date.parse(payload.createdAt))) errors.push('Invalid createdAt');
  if (!payload.publicKey || typeof payload.publicKey !== 'string') errors.push('Invalid publicKey');
  if (!payload.signature || typeof payload.signature !== 'string') errors.push('Invalid signature');
  if (!payload.contentHash || typeof payload.contentHash !== 'string') errors.push('Invalid contentHash');
  errors.push(...validateAuthor(payload.author));
  return errors;
}

function toListRecord(record) {
  return {
    id: record.id,
    url: record.url,
    title: record.title,
    excerpt: record.excerpt,
    createdAt: record.createdAt,
    receivedAt: record.receivedAt,
    fingerprint: record.fingerprint,
    author: record.author
  };
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = normalizeText(url.searchParams.get('query') || '').toLowerCase();
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

    let filtered = await getRecords();
    if (query) {
      filtered = filtered.filter((record) => {
        const haystack = `${record.title} ${record.excerpt} ${record.url}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    const slice = filtered
      .slice()
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
      .slice(offset, offset + limit)
      .map(toListRecord);

    sendJson(res, 200, { total: filtered.length, items: slice });
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
  const errors = validatePayload(payload);
  if (errors.length) {
    sendJson(res, 400, { error: 'Validation failed', details: errors });
    return;
  }

  const normalizedExcerpt = normalizeText(payload.excerpt);
  const contentHash = computeContentHash(normalizedExcerpt);
  if (contentHash !== payload.contentHash) {
    sendJson(res, 400, { error: 'Content hash mismatch' });
    return;
  }

  const message = canonicalMessage({
    version: payload.version,
    url: payload.url,
    title: payload.title,
    excerpt: normalizedExcerpt,
    contentHash: payload.contentHash,
    createdAt: payload.createdAt
  });

  const messageBytesValue = messageBytes({
    version: payload.version,
    url: payload.url,
    title: payload.title,
    excerpt: normalizedExcerpt,
    contentHash: payload.contentHash,
    createdAt: payload.createdAt
  });

  const publicKeyBytes = base64ToBytes(payload.publicKey);
  const signatureBytes = base64ToBytes(payload.signature);

  const isValid = await ed.verifyAsync(signatureBytes, messageBytesValue, publicKeyBytes);
  if (!isValid) {
    sendJson(res, 400, { error: 'Invalid signature' });
    return;
  }

  const records = await getRecords();
  const duplicate = records.find(
    (record) =>
      record.publicKey === payload.publicKey &&
      record.contentHash === payload.contentHash &&
      record.url === payload.url
  );

  if (duplicate) {
    const updatedAuthor = sanitizeAuthor(payload.author);
    if (updatedAuthor) {
      duplicate.author = updatedAuthor;
      await setRecords(records);
    }
    sendJson(res, 200, { ...duplicate, duplicate: true });
    return;
  }

  const existing = records.find(
    (record) => record.signature === payload.signature && record.publicKey === payload.publicKey
  );
  if (existing) {
    sendJson(res, 200, existing);
    return;
  }

  const record = {
    id: randomUUID(),
    version: payload.version,
    url: payload.url,
    title: payload.title,
    excerpt: normalizedExcerpt,
    contentHash: payload.contentHash,
    createdAt: payload.createdAt,
    receivedAt: new Date().toISOString(),
    publicKey: payload.publicKey,
    signature: payload.signature,
    fingerprint: fingerprintFromPublicKey(payload.publicKey),
    canonicalMessage: message,
    author: sanitizeAuthor(payload.author)
  };

  records.push(record);
  await setRecords(records);

  sendJson(res, 200, record);
}
