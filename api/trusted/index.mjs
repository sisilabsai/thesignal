import { applyCors } from '../_lib/cors.mjs';
import { sendJson } from '../_lib/utils.mjs';
import { getTrustedDomains } from '../_lib/store.mjs';

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

  const domains = await getTrustedDomains();
  const sorted = Array.isArray(domains) ? domains.slice().sort() : [];
  sendJson(res, 200, { domains: sorted });
}
