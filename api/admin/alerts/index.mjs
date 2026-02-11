import { applyCors } from '../../_lib/cors.mjs';
import { parseJsonBody, sendJson } from '../../_lib/utils.mjs';
import { requireAdmin } from '../../_lib/adminAuth.mjs';
import { getAlerts, setAlerts } from '../../_lib/store.mjs';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const alerts = await getAlerts();
    const items = Array.isArray(alerts) ? alerts.slice() : [];
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    sendJson(res, 200, { total: items.length, items });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await parseJsonBody(req);
  if (!payload || payload.action !== 'remove' || !payload.id) {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  const alerts = await getAlerts();
  const items = Array.isArray(alerts) ? alerts.slice() : [];
  const index = items.findIndex((alert) => alert.id === payload.id);
  if (index === -1) {
    sendJson(res, 404, { error: 'Alert not found' });
    return;
  }

  const removed = items.splice(index, 1)[0];
  await setAlerts(items);
  sendJson(res, 200, { ok: true, alert: removed });
}
