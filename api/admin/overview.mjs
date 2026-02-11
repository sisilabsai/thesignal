import { applyCors } from '../_lib/cors.mjs';
import { sendJson } from '../_lib/utils.mjs';
import { requireAdmin } from '../_lib/adminAuth.mjs';
import { getRecords, getSubmissions, getAlerts, getTrustedDomains } from '../_lib/store.mjs';

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
  const submissions = await getSubmissions();
  const alerts = await getAlerts();
  const trustedDomains = await getTrustedDomains();

  const pending = submissions.filter((item) => (item.status || 'pending') === 'pending').length;
  const approved = submissions.filter((item) => item.status === 'approved').length;
  const rejected = submissions.filter((item) => item.status === 'rejected').length;

  const authors = new Set(records.map((record) => record.fingerprint).filter(Boolean));

  sendJson(res, 200, {
    totals: {
      verified: records.length,
      authors: authors.size,
      submissions: submissions.length,
      alerts: alerts.length,
      trustedDomains: Array.isArray(trustedDomains) ? trustedDomains.length : 0
    },
    submissions: { pending, approved, rejected }
  });
}
