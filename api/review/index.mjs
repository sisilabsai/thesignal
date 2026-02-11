import { applyCors } from '../_lib/cors.mjs';
import { parseJsonBody, sendJson, isValidUrl } from '../_lib/utils.mjs';
import { getSubmissions, setSubmissions, addTrustedDomain } from '../_lib/store.mjs';
import { requireAdmin } from '../_lib/adminAuth.mjs';

function getDomain(url) {
  if (!url || !isValidUrl(url)) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeSubmission(submission) {
  if (!submission || typeof submission !== 'object') return null;
  return { ...submission, status: submission.status || 'pending' };
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
    const status = url.searchParams.get('status') || 'pending';

    const submissions = (await getSubmissions())
      .map(normalizeSubmission)
      .filter(Boolean);

    const filtered =
      status === 'all' ? submissions : submissions.filter((item) => item.status === status);

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    sendJson(res, 200, { total: filtered.length, items: filtered });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const payload = await parseJsonBody(req);
  if (!payload || !payload.id) {
    sendJson(res, 400, { error: 'Missing submission id' });
    return;
  }

  const action = (payload.action || 'approve').toLowerCase();
  if (!['approve', 'reject'].includes(action)) {
    sendJson(res, 400, { error: 'Invalid action' });
    return;
  }

  const submissions = await getSubmissions();
  const index = submissions.findIndex((item) => item.id === payload.id);
  if (index === -1) {
    sendJson(res, 404, { error: 'Submission not found' });
    return;
  }

  const current = normalizeSubmission(submissions[index]);
  if (current.status === 'approved') {
    sendJson(res, 200, { ok: true, submission: current, trustedDomain: getDomain(current.url) });
    return;
  }

  if (action === 'reject') {
    const rejected = {
      ...current,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: payload.reason ? String(payload.reason).slice(0, 240) : ''
    };
    submissions[index] = rejected;
    await setSubmissions(submissions);
    sendJson(res, 200, { ok: true, submission: rejected });
    return;
  }

  const approved = {
    ...current,
    status: 'approved',
    approvedAt: new Date().toISOString()
  };

  submissions[index] = approved;
  await setSubmissions(submissions);

  const trustedDomain = getDomain(approved.url);
  if (trustedDomain) {
    await addTrustedDomain(trustedDomain);
  }

  sendJson(res, 200, { ok: true, submission: approved, trustedDomain });
}
