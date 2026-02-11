const tokenInput = document.getElementById('admin-token');
const saveTokenBtn = document.getElementById('save-token');
const clearTokenBtn = document.getElementById('clear-token');
const logoutBtn = document.getElementById('logout-btn');
const tokenStatusEl = document.getElementById('token-status');
const loginEmailInput = document.getElementById('admin-email');
const loginPasswordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');

const overviewCardsEl = document.getElementById('overview-cards');
const overviewStatusEl = document.getElementById('overview-status');

const submissionsFilter = document.getElementById('submissions-filter');
const refreshSubmissionsBtn = document.getElementById('refresh-submissions');
const submissionsStatusEl = document.getElementById('submissions-status');
const submissionsListEl = document.getElementById('submissions-list');
const submissionsEmptyEl = document.getElementById('submissions-empty');

const recordsQueryInput = document.getElementById('records-query');
const searchRecordsBtn = document.getElementById('search-records');
const recordsStatusEl = document.getElementById('records-status');
const recordsListEl = document.getElementById('records-list');
const recordsEmptyEl = document.getElementById('records-empty');

const refreshAuthorsBtn = document.getElementById('refresh-authors');
const authorsStatusEl = document.getElementById('authors-status');
const authorsListEl = document.getElementById('authors-list');
const authorsEmptyEl = document.getElementById('authors-empty');

const refreshAlertsBtn = document.getElementById('refresh-alerts');
const alertsStatusEl = document.getElementById('alerts-status');
const alertsListEl = document.getElementById('alerts-list');
const alertsEmptyEl = document.getElementById('alerts-empty');

const refreshTrustedBtn = document.getElementById('refresh-trusted');
const trustedListEl = document.getElementById('trusted-list');

const ADMIN_TOKEN_KEY = 'signal:adminToken';
const ADMIN_EMAIL_KEY = 'signal:adminEmail';

function setStatus(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#b00020' : '#5f5b54';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function saveToken(value) {
  if (!value) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } else {
    localStorage.setItem(ADMIN_TOKEN_KEY, value);
  }
}

function saveEmail(value) {
  if (!value) {
    localStorage.removeItem(ADMIN_EMAIL_KEY);
  } else {
    localStorage.setItem(ADMIN_EMAIL_KEY, value);
  }
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { 'X-Admin-Token': token } : {};
}

async function fetchAdminJson(url, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Admin token required');
  const headers = {
    ...(options.headers || {}),
    ...getAuthHeaders()
  };
  if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function setAuthStatus(message, isError = false) {
  setStatus(tokenStatusEl, message, isError);
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function renderOverview(data) {
  overviewCardsEl.innerHTML = '';
  if (!data?.totals) {
    setStatus(overviewStatusEl, 'No overview data.', true);
    return;
  }

  const cards = [
    { label: 'Verified', value: data.totals.verified },
    { label: 'Authors', value: data.totals.authors },
    { label: 'Submissions', value: data.totals.submissions },
    { label: 'Alerts', value: data.totals.alerts },
    { label: 'Trusted domains', value: data.totals.trustedDomains },
    { label: 'Pending approvals', value: data.submissions?.pending ?? 0 }
  ];

  cards.forEach((card) => {
    const el = document.createElement('div');
    el.className = 'stat';
    el.innerHTML = `
      <div class="stat-value">${card.value}</div>
      <div class="stat-label">${card.label}</div>
    `;
    overviewCardsEl.appendChild(el);
  });
  setStatus(overviewStatusEl, 'Overview updated.');
}

function renderSubmissions(items) {
  submissionsListEl.innerHTML = '';
  if (!items.length) {
    submissionsEmptyEl.classList.remove('hidden');
    return;
  }
  submissionsEmptyEl.classList.add('hidden');

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'queue-item';
    const domain = getDomain(item.url);
    const status = item.status || 'pending';
    const badge = status === 'approved' ? 'Trusted' : status === 'rejected' ? 'Rejected' : 'Pending';
    const badgeClass = status === 'approved' ? 'badge trusted' : 'badge';
    const reason = item.rejectionReason ? `<div class="muted">Reason: ${escapeHtml(item.rejectionReason)}</div>` : '';
    card.innerHTML = `
      <div class="queue-head">
        <div>
          <h4>${escapeHtml(item.name || 'Untitled submission')}</h4>
          <div class="muted">Submitted: ${formatDate(item.createdAt)}</div>
        </div>
        <span class="${badgeClass}">${badge}</span>
      </div>
      <div class="queue-meta">
        <div><strong>Website:</strong> <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a></div>
        <div><strong>Contact:</strong> ${escapeHtml(item.contactEmail || 'N/A')}</div>
        <div><strong>Category:</strong> ${escapeHtml(item.category || 'N/A')}</div>
        <div><strong>Domain:</strong> ${escapeHtml(domain || 'N/A')}</div>
      </div>
      <p class="muted">${escapeHtml(item.notes || 'No notes provided.')}</p>
      ${reason}
      <div class="queue-actions">
        ${status === 'pending' ? '<button class="btn secondary" data-action="approve">Approve + Trust Domain</button>' : ''}
        ${status === 'pending' ? '<button class="btn ghost" data-action="reject">Reject</button>' : ''}
        ${item.sampleUrl ? `<a class="btn outline" href="${escapeHtml(item.sampleUrl)}" target="_blank" rel="noreferrer">Open sample</a>` : ''}
      </div>
    `;

    const approveBtn = card.querySelector('[data-action="approve"]');
    const rejectBtn = card.querySelector('[data-action="reject"]');

    approveBtn?.addEventListener('click', async () => {
      approveBtn.disabled = true;
      const originalText = approveBtn.textContent;
      approveBtn.textContent = 'Approving...';
      try {
        await updateSubmission(item.id, 'approve');
        setStatus(submissionsStatusEl, `Approved ${item.name}.`);
        await loadSubmissions();
        await loadTrustedDomains();
        await loadOverview();
      } catch (err) {
        setStatus(submissionsStatusEl, `Approve failed: ${err.message}`, true);
      } finally {
        approveBtn.disabled = false;
        approveBtn.textContent = originalText;
      }
    });

    rejectBtn?.addEventListener('click', async () => {
      const reasonText = window.prompt('Rejection reason (optional):', '');
      rejectBtn.disabled = true;
      const originalText = rejectBtn.textContent;
      rejectBtn.textContent = 'Rejecting...';
      try {
        await updateSubmission(item.id, 'reject', reasonText || '');
        setStatus(submissionsStatusEl, `Rejected ${item.name}.`);
        await loadSubmissions();
        await loadOverview();
      } catch (err) {
        setStatus(submissionsStatusEl, `Reject failed: ${err.message}`, true);
      } finally {
        rejectBtn.disabled = false;
        rejectBtn.textContent = originalText;
      }
    });

    submissionsListEl.appendChild(card);
  });
}

function renderRecords(items) {
  recordsListEl.innerHTML = '';
  if (!items.length) {
    recordsEmptyEl.classList.remove('hidden');
    return;
  }
  recordsEmptyEl.classList.add('hidden');

  items.forEach((record) => {
    const card = document.createElement('article');
    card.className = 'queue-item';
    const authorName = record.author?.name || record.author?.handle || 'Unknown';
    card.innerHTML = `
      <div class="queue-head">
        <div>
          <h4>${escapeHtml(record.title)}</h4>
          <div class="muted">Signed: ${formatDate(record.createdAt)} • Received: ${formatDate(record.receivedAt)}</div>
        </div>
        <span class="badge">Verified</span>
      </div>
      <div class="queue-meta">
        <div><strong>URL:</strong> <a href="${escapeHtml(record.url)}" target="_blank" rel="noreferrer">${escapeHtml(record.url)}</a></div>
        <div><strong>Author:</strong> ${escapeHtml(authorName)}</div>
        <div><strong>Fingerprint:</strong> ${escapeHtml(record.fingerprint || 'N/A')}</div>
      </div>
      <p class="muted">${escapeHtml(record.excerpt || '')}</p>
      <div class="queue-actions">
        <button class="btn ghost" data-action="remove">Remove from index</button>
      </div>
    `;

    const removeBtn = card.querySelector('[data-action="remove"]');
    removeBtn?.addEventListener('click', async () => {
      if (!window.confirm('Remove this verified entry from the index?')) return;
      removeBtn.disabled = true;
      const originalText = removeBtn.textContent;
      removeBtn.textContent = 'Removing...';
      try {
        await removeRecord(record.id);
        setStatus(recordsStatusEl, 'Record removed.');
        await loadRecords();
        await loadOverview();
      } catch (err) {
        setStatus(recordsStatusEl, `Remove failed: ${err.message}`, true);
      } finally {
        removeBtn.disabled = false;
        removeBtn.textContent = originalText;
      }
    });

    recordsListEl.appendChild(card);
  });
}

function renderAuthors(items) {
  authorsListEl.innerHTML = '';
  if (!items.length) {
    authorsEmptyEl.classList.remove('hidden');
    return;
  }
  authorsEmptyEl.classList.add('hidden');

  items.forEach((author) => {
    const card = document.createElement('article');
    card.className = 'author-card';
    const name = author.author?.name || author.author?.handle || 'Unknown author';
    const url = author.author?.url ? `<a href="${escapeHtml(author.author.url)}" target="_blank" rel="noreferrer">${escapeHtml(author.author.url)}</a>` : 'N/A';
    card.innerHTML = `
      <h4>${escapeHtml(name)}</h4>
      <div class="muted">Fingerprint: ${escapeHtml(author.fingerprint)}</div>
      <div class="muted">Entries: ${author.count}</div>
      <div class="muted">Last seen: ${formatDate(author.lastSeen)}</div>
      <div class="muted">Website: ${url}</div>
      <div class="queue-actions">
        <a class="btn ghost" href="/author.html?fingerprint=${encodeURIComponent(author.fingerprint)}" target="_blank" rel="noreferrer">View profile</a>
      </div>
    `;
    authorsListEl.appendChild(card);
  });
}

function renderAlerts(items) {
  alertsListEl.innerHTML = '';
  if (!items.length) {
    alertsEmptyEl.classList.remove('hidden');
    return;
  }
  alertsEmptyEl.classList.add('hidden');

  items.forEach((alert) => {
    const card = document.createElement('article');
    card.className = 'queue-item';
    card.innerHTML = `
      <div class="queue-head">
        <div>
          <h4>${escapeHtml(alert.email || 'Unknown email')}</h4>
          <div class="muted">Created: ${formatDate(alert.createdAt || '')}</div>
        </div>
        <span class="badge">${escapeHtml(alert.frequency || 'daily')}</span>
      </div>
      <div class="queue-meta">
        <div><strong>Query:</strong> ${escapeHtml(alert.query || 'N/A')}</div>
      </div>
      <div class="queue-actions">
        <button class="btn ghost" data-action="remove">Remove alert</button>
      </div>
    `;

    const removeBtn = card.querySelector('[data-action="remove"]');
    removeBtn?.addEventListener('click', async () => {
      if (!window.confirm('Remove this alert?')) return;
      removeBtn.disabled = true;
      const originalText = removeBtn.textContent;
      removeBtn.textContent = 'Removing...';
      try {
        await removeAlert(alert.id);
        setStatus(alertsStatusEl, 'Alert removed.');
        await loadAlerts();
        await loadOverview();
      } catch (err) {
        setStatus(alertsStatusEl, `Remove failed: ${err.message}`, true);
      } finally {
        removeBtn.disabled = false;
        removeBtn.textContent = originalText;
      }
    });

    alertsListEl.appendChild(card);
  });
}

async function login() {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  if (!email || !password) {
    setAuthStatus('Enter email and password.', true);
    return;
  }

  setAuthStatus('Signing in...');
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Login failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.token) throw new Error('No admin token returned');
    saveToken(data.token);
    saveEmail(email);
    loginPasswordInput.value = '';
    tokenInput.value = data.token;
    setAuthStatus('Signed in.');
    await loadAll();
  } catch (err) {
    setAuthStatus(err.message, true);
  }
}

async function updateSubmission(id, action, reason) {
  return fetchAdminJson('/api/review', {
    method: 'POST',
    body: JSON.stringify({ id, action, reason })
  });
}

async function removeRecord(id) {
  return fetchAdminJson('/api/admin/records', {
    method: 'POST',
    body: JSON.stringify({ id, action: 'remove' })
  });
}

async function removeAlert(id) {
  return fetchAdminJson('/api/admin/alerts', {
    method: 'POST',
    body: JSON.stringify({ id, action: 'remove' })
  });
}

async function loadOverview() {
  if (!getToken()) {
    setStatus(overviewStatusEl, 'Sign in to load overview.');
    overviewCardsEl.innerHTML = '';
    return;
  }
  setStatus(overviewStatusEl, 'Loading overview...');
  try {
    const data = await fetchAdminJson('/api/admin/overview');
    renderOverview(data);
  } catch (err) {
    setStatus(overviewStatusEl, `Failed to load overview: ${err.message}`, true);
    overviewCardsEl.innerHTML = '';
  }
}

async function loadSubmissions() {
  if (!getToken()) {
    setStatus(submissionsStatusEl, 'Sign in to load submissions.');
    submissionsListEl.innerHTML = '';
    submissionsEmptyEl.classList.add('hidden');
    return;
  }
  setStatus(submissionsStatusEl, 'Loading submissions...');
  try {
    const status = submissionsFilter.value;
    const data = await fetchAdminJson(`/api/review?status=${encodeURIComponent(status)}`);
    renderSubmissions(data.items || []);
    setStatus(submissionsStatusEl, data.items?.length ? `Loaded ${data.items.length} submissions.` : 'No submissions found.');
  } catch (err) {
    setStatus(submissionsStatusEl, `Failed to load submissions: ${err.message}`, true);
    submissionsListEl.innerHTML = '';
    submissionsEmptyEl.classList.add('hidden');
  }
}

async function loadRecords() {
  if (!getToken()) {
    setStatus(recordsStatusEl, 'Sign in to load verified content.');
    recordsListEl.innerHTML = '';
    recordsEmptyEl.classList.add('hidden');
    return;
  }
  setStatus(recordsStatusEl, 'Loading verified content...');
  try {
    const query = recordsQueryInput.value.trim();
    const data = await fetchAdminJson(`/api/admin/records?query=${encodeURIComponent(query)}`);
    renderRecords(data.items || []);
    setStatus(recordsStatusEl, data.items?.length ? `Loaded ${data.items.length} records.` : 'No records found.');
  } catch (err) {
    setStatus(recordsStatusEl, `Failed to load records: ${err.message}`, true);
    recordsListEl.innerHTML = '';
    recordsEmptyEl.classList.add('hidden');
  }
}

async function loadAuthors() {
  if (!getToken()) {
    setStatus(authorsStatusEl, 'Sign in to load authors.');
    authorsListEl.innerHTML = '';
    authorsEmptyEl.classList.add('hidden');
    return;
  }
  setStatus(authorsStatusEl, 'Loading authors...');
  try {
    const data = await fetchAdminJson('/api/admin/authors');
    renderAuthors(data.items || []);
    setStatus(authorsStatusEl, data.items?.length ? `Loaded ${data.items.length} authors.` : 'No authors found.');
  } catch (err) {
    setStatus(authorsStatusEl, `Failed to load authors: ${err.message}`, true);
    authorsListEl.innerHTML = '';
    authorsEmptyEl.classList.add('hidden');
  }
}

async function loadAlerts() {
  if (!getToken()) {
    setStatus(alertsStatusEl, 'Sign in to load alerts.');
    alertsListEl.innerHTML = '';
    alertsEmptyEl.classList.add('hidden');
    return;
  }
  setStatus(alertsStatusEl, 'Loading alerts...');
  try {
    const data = await fetchAdminJson('/api/admin/alerts');
    renderAlerts(data.items || []);
    setStatus(alertsStatusEl, data.items?.length ? `Loaded ${data.items.length} alerts.` : 'No alerts found.');
  } catch (err) {
    setStatus(alertsStatusEl, `Failed to load alerts: ${err.message}`, true);
    alertsListEl.innerHTML = '';
    alertsEmptyEl.classList.add('hidden');
  }
}

async function loadTrustedDomains() {
  try {
    const data = await fetch('/api/trusted');
    if (!data.ok) throw new Error('Unable to load trusted domains');
    const json = await data.json();
    const domains = Array.isArray(json.domains) ? json.domains : [];
    if (!domains.length) {
      trustedListEl.innerHTML = '<div class="muted">No trusted domains yet.</div>';
      return;
    }
    trustedListEl.innerHTML = domains.map((domain) => `<span class="badge">${escapeHtml(domain)}</span>`).join(' ');
  } catch {
    trustedListEl.innerHTML = '<div class="muted">Unable to load trusted domains.</div>';
  }
}

async function loadAll() {
  await Promise.all([loadOverview(), loadSubmissions(), loadRecords(), loadAuthors(), loadAlerts(), loadTrustedDomains()]);
}

loginBtn?.addEventListener('click', login);

saveTokenBtn?.addEventListener('click', () => {
  const value = tokenInput.value.trim();
  saveToken(value);
  setAuthStatus(value ? 'Token saved.' : 'Token cleared.');
  loadAll();
});

clearTokenBtn?.addEventListener('click', () => {
  tokenInput.value = '';
  saveToken('');
  setAuthStatus('Token cleared.');
  loadAll();
});

logoutBtn?.addEventListener('click', () => {
  saveToken('');
  tokenInput.value = '';
  loginPasswordInput.value = '';
  setAuthStatus('Logged out.');
  loadAll();
});

refreshSubmissionsBtn?.addEventListener('click', loadSubmissions);
submissionsFilter?.addEventListener('change', loadSubmissions);
searchRecordsBtn?.addEventListener('click', loadRecords);
recordsQueryInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadRecords();
});
refreshAuthorsBtn?.addEventListener('click', loadAuthors);
refreshAlertsBtn?.addEventListener('click', loadAlerts);
refreshTrustedBtn?.addEventListener('click', loadTrustedDomains);

const existingToken = getToken();
if (existingToken) {
  tokenInput.value = existingToken;
  setAuthStatus('Token loaded from browser storage.');
}

const existingEmail = localStorage.getItem(ADMIN_EMAIL_KEY) || '';
if (existingEmail) {
  loginEmailInput.value = existingEmail;
}

loadAll();
