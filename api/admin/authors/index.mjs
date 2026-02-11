import { applyCors } from '../../_lib/cors.mjs';
import { sendJson } from '../../_lib/utils.mjs';
import { requireAdmin } from '../../_lib/adminAuth.mjs';
import { getRecords } from '../../_lib/store.mjs';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (!requireAdmin(req, res)) return;

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const records = await getRecords();
  const byFingerprint = new Map();

  records.forEach((record) => {
    if (!record.fingerprint) return;
    const existing = byFingerprint.get(record.fingerprint) || {
      fingerprint: record.fingerprint,
      count: 0,
      author: record.author || null,
      lastSeen: record.receivedAt
    };
    existing.count += 1;
    if (record.author) {
      existing.author = record.author;
    }
    if (new Date(record.receivedAt) > new Date(existing.lastSeen)) {
      existing.lastSeen = record.receivedAt;
    }
    byFingerprint.set(record.fingerprint, existing);
  });

  const authors = Array.from(byFingerprint.values()).sort((a, b) => b.count - a.count);
  sendJson(res, 200, { total: authors.length, items: authors });
}
