import { applyCors } from '../_lib/cors.mjs';
import { sendJson, normalizeText } from '../_lib/utils.mjs';
import { getAlerts, setAlerts, getRecords } from '../_lib/store.mjs';
import { sendMail, mailConfigured } from '../_lib/mailer.mjs';

function matchesQuery(record, query) {
  if (!query) return false;
  const haystack = `${record.title} ${record.excerpt} ${record.url}`.toLowerCase();
  return haystack.includes(query);
}

function formatDigest(items) {
  return items
    .map((item) => `- ${item.title} (${item.url})`)
    .join('\n');
}

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

  if (!mailConfigured()) {
    sendJson(res, 200, { ok: false, error: 'SMTP not configured' });
    return;
  }

  const alerts = await getAlerts();
  const records = await getRecords();
  const now = new Date().toISOString();

  const updatedAlerts = [];
  let sent = 0;

  for (const alert of alerts) {
    if (!alert.active) {
      updatedAlerts.push(alert);
      continue;
    }

    const query = normalizeText(alert.query || '').toLowerCase();
    if (!query) {
      updatedAlerts.push(alert);
      continue;
    }

    const lastSentAt = alert.lastSentAt ? new Date(alert.lastSentAt) : new Date(0);
    const matches = records.filter((record) => {
      const receivedAt = record.receivedAt ? new Date(record.receivedAt) : new Date(0);
      return receivedAt > lastSentAt && matchesQuery(record, query);
    });

    if (!matches.length) {
      updatedAlerts.push(alert);
      continue;
    }

    const subject = `Signal alert: ${matches.length} new match(es) for "${alert.query}"`;
    const text = [
      `New verified items for: ${alert.query}`,
      '',
      formatDigest(matches.slice(0, 10)),
      '',
      'Visit The Signal to explore more.'
    ].join('\n');

    await sendMail({ to: alert.email, subject, text });
    sent += 1;

    updatedAlerts.push({
      ...alert,
      lastSentAt: now
    });
  }

  await setAlerts(updatedAlerts);
  sendJson(res, 200, { ok: true, sent });
}
