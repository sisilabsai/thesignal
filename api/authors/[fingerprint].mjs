import { applyCors } from '../_lib/cors.mjs';
import { sendJson } from '../_lib/utils.mjs';
import { getRecords } from '../_lib/store.mjs';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const fingerprint = segments[segments.length - 1];

  const records = await getRecords();
  const items = records.filter((record) => record.fingerprint === fingerprint);
  if (!items.length) {
    sendJson(res, 404, { error: 'Author not found' });
    return;
  }

  const author = items.find((item) => item.author)?.author || null;
  const latest = items
    .slice()
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

  sendJson(res, 200, {
    fingerprint,
    author,
    total: items.length,
    items: latest
  });
}
