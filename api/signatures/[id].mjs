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

  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const records = await getRecords();
  const record = records.find((item) => item.id === id);
  if (!record) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  sendJson(res, 200, record);
}
