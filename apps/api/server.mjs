import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { randomUUID } from 'node:crypto';
import * as ed from '@noble/ed25519';
import {
  SIGNING_VERSION,
  computeContentHash,
  canonicalMessage,
  messageBytes,
  base64ToBytes,
  fingerprintFromPublicKey,
  normalizeText
} from '../../packages/shared/signing.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const dataPath = path.join(repoRoot, 'data', 'signatures.json');

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });
await fastify.register(staticPlugin, {
  root: path.join(repoRoot, 'public'),
  index: ['index.html']
});

let records = [];
const rateLimits = new Map();
const RATE_LIMIT = { windowMs: 60_000, limit: 20 };

async function loadRecords() {
  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) records = parsed;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, '[]');
    records = [];
  }
}

async function saveRecords() {
  await fs.writeFile(dataPath, JSON.stringify(records, null, 2));
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeAuthorField(value) {
  if (typeof value !== 'string') return '';
  return normalizeText(value);
}

function validateAuthor(author) {
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

function sanitizeAuthor(author) {
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

function getClientKey(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || request.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key) {
  const now = Date.now();
  let entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT.windowMs };
  }
  entry.count += 1;
  rateLimits.set(key, entry);
  const remaining = Math.max(RATE_LIMIT.limit - entry.count, 0);
  return { allowed: entry.count <= RATE_LIMIT.limit, remaining, resetAt: entry.resetAt };
}

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

await loadRecords();

fastify.get('/api/health', async () => ({ status: 'ok' }));

fastify.get('/api/signatures', async (request) => {
  const query = normalizeText(request.query.query || '').toLowerCase();
  const limit = Math.min(Number(request.query.limit) || 50, 200);
  const offset = Math.max(Number(request.query.offset) || 0, 0);

  let filtered = records;
  if (query) {
    filtered = records.filter((record) => {
      const haystack = `${record.title} ${record.excerpt} ${record.url}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  const slice = filtered
    .slice()
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
    .slice(offset, offset + limit)
    .map(toListRecord);

  return { total: filtered.length, items: slice };
});

fastify.get('/api/signatures/:id', async (request, reply) => {
  const record = records.find((r) => r.id === request.params.id);
  if (!record) return reply.code(404).send({ error: 'Not found' });
  return record;
});

fastify.post('/api/signatures', async (request, reply) => {
  const rate = checkRateLimit(getClientKey(request));
  reply.header('X-RateLimit-Limit', RATE_LIMIT.limit);
  reply.header('X-RateLimit-Remaining', rate.remaining);
  reply.header('X-RateLimit-Reset', new Date(rate.resetAt).toISOString());
  if (!rate.allowed) {
    return reply.code(429).send({ error: 'Rate limit exceeded', resetAt: new Date(rate.resetAt).toISOString() });
  }

  const payload = request.body;
  const errors = validatePayload(payload);
  if (errors.length) return reply.code(400).send({ error: 'Validation failed', details: errors });

  const normalizedExcerpt = normalizeText(payload.excerpt);
  const contentHash = computeContentHash(normalizedExcerpt);
  if (contentHash !== payload.contentHash) {
    return reply.code(400).send({ error: 'Content hash mismatch' });
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
  if (!isValid) return reply.code(400).send({ error: 'Invalid signature' });

  const duplicate = records.find(
    (r) => r.publicKey === payload.publicKey && r.contentHash === payload.contentHash && r.url === payload.url
  );
  if (duplicate) {
    const updatedAuthor = sanitizeAuthor(payload.author);
    if (updatedAuthor) {
      duplicate.author = updatedAuthor;
      await saveRecords();
    }
    return { ...duplicate, duplicate: true };
  }

  const existing = records.find((r) => r.signature === payload.signature && r.publicKey === payload.publicKey);
  if (existing) return existing;

  const author = sanitizeAuthor(payload.author);
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
    author
  };

  records.push(record);
  await saveRecords();

  return record;
});

const port = Number(process.env.PORT) || 8787;
const host = process.env.HOST || '0.0.0.0';

fastify.listen({ port, host }).catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
