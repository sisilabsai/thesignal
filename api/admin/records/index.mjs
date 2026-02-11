import { applyCors } from '../../_lib/cors.mjs';
import { parseJsonBody, sendJson, normalizeText } from '../../_lib/utils.mjs';
import { requireAdmin } from '../../_lib/adminAuth.mjs';
import { getRecords, setRecords } from '../../_lib/store.mjs';

function toAdminRecord(record) {
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

  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = normalizeText(url.searchParams.get('query') || '').toLowerCase();
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

    let records = await getRecords();
    if (query) {
      records = records.filter((record) => {
        const haystack = `${record.title} ${record.excerpt} ${record.url}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    const slice = records
      .slice()
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
      .slice(offset, offset + limit)
      .map(toAdminRecord);

    sendJson(res, 200, { total: records.length, items: slice });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await parseJsonBody(req);
  if (!payload || !payload.id || payload.action !== 'remove') {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  const records = await getRecords();
  const index = records.findIndex((record) => record.id === payload.id);
  if (index === -1) {
    sendJson(res, 404, { error: 'Record not found' });
    return;
  }

  const removed = records.splice(index, 1)[0];
  await setRecords(records);
  sendJson(res, 200, { ok: true, record: toAdminRecord(removed) });
}
