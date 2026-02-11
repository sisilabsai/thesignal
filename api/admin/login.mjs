import { applyCors } from '../_lib/cors.mjs';
import { parseJsonBody, sendJson } from '../_lib/utils.mjs';
import { getAdminToken, verifyAdminCredentials } from '../_lib/adminAuth.mjs';

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

  const payload = await parseJsonBody(req);
  if (!payload || !payload.email || !payload.password) {
    sendJson(res, 400, { error: 'Email and password required' });
    return;
  }

  if (!verifyAdminCredentials(String(payload.email), String(payload.password))) {
    sendJson(res, 401, { error: 'Invalid credentials' });
    return;
  }

  const token = getAdminToken();
  if (!token) {
    sendJson(res, 500, { error: 'Admin token not configured' });
    return;
  }

  sendJson(res, 200, { ok: true, token });
}
