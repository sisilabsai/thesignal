import { applyCors } from './_lib/cors.mjs';
import { sendJson } from './_lib/utils.mjs';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  sendJson(res, 200, { status: 'ok' });
}
