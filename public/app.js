const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');
const refreshBtn = document.getElementById('refresh-btn');
const verifiedToggle = document.getElementById('filter-verified');
const openToggle = document.getElementById('filter-open');
const sortSelect = document.getElementById('sort-by');
const viewSelect = document.getElementById('view-mode');
const verifiedListEl = document.getElementById('verified-list');
const openListEl = document.getElementById('open-list');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const statusLineEl = document.getElementById('status-line');
const detailEl = document.getElementById('detail');
const emptyStateEl = document.getElementById('empty-state');
const resultsEl = document.getElementById('results');
const insightsEl = document.getElementById('insights');
const copyApiBtn = document.getElementById('copy-api');
const verifiedCountEl = document.getElementById('verified-count');
const openCountEl = document.getElementById('open-count');
const signalStatusEl = document.getElementById('signal-status');

const params = new URLSearchParams(window.location.search);
const currentId = params.get('id');

const API_BASE = window.location.origin;
const PREFS_KEY = 'signal:prefs:v1';

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

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00020' : '#5f5b54';
}

function savePrefs() {
  const prefs = {
    query: queryInput.value.trim(),
    verified: verifiedToggle.checked,
    open: openToggle.checked,
    sort: sortSelect.value,
    view: viewSelect.value
  };
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function renderAuthor(author) {
  if (!author) return '';
  const displayName = author.name || author.handle || 'Unknown';
  const handle = author.name && author.handle ? ` <span class="handle">${escapeHtml(author.handle)}</span>` : '';
  const url = author.url ? ` <span class="author-url">${escapeHtml(author.url)}</span>` : '';
  return `<div class="author">By ${escapeHtml(displayName)}${handle}${url}</div>`;
}

function renderCard(item, type) {
  const label = type === 'open' ? 'Open Feed' : 'Verified';
  const labelClass = type === 'open' ? 'label open' : 'label';
  const metaLine = type === 'open'
    ? `<span>Source: ${escapeHtml(item.source || getDomain(item.url))}</span>`
    : `<span>Signed: ${escapeHtml(formatDate(item.createdAt))}</span>`;
  const fingerprint = item.fingerprint ? `<span>Fingerprint: ${escapeHtml(item.fingerprint.slice(0, 12))}</span>` : '';

  const titleLink = type === 'open'
    ? `<a class="title" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
    : `<a class="title" href="?id=${item.id}">${escapeHtml(item.title)}</a>`;

  const sourceLink = `
    <div class="detail-actions">
      <a class="btn ghost" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open Source</a>
    </div>
  `;

  return `
    <article class="card">
      <div class="card-header">
        ${titleLink}
        <span class="${labelClass}">${label}</span>
      </div>
      <div class="url">${escapeHtml(item.url)}</div>
      ${type === 'open' ? '' : renderAuthor(item.author)}
      <p class="excerpt">${escapeHtml(item.excerpt)}</p>
      <div class="meta">
        ${metaLine}
        ${fingerprint}
      </div>
      ${sourceLink}
    </article>
  `;
}

function renderList(listEl, items, type) {
  if (!items.length) {
    listEl.innerHTML = '<div class="empty">No items yet.</div>';
    return;
  }

  listEl.innerHTML = items.map((item) => renderCard(item, type)).join('');
}

function renderDetail(record) {
  detailEl.classList.remove('hidden');
  resultsEl.classList.add('hidden');
  emptyStateEl.classList.add('hidden');

  const author = record.author;
  const authorBio = author?.bio ? `<div class="author-bio">${escapeHtml(author.bio)}</div>` : '';

  detailEl.innerHTML = `
    <div class="detail-card">
      <a class="back" href="/">Back to index</a>
      <h1>${escapeHtml(record.title)}</h1>
      <div class="url">${escapeHtml(record.url)}</div>
      ${renderAuthor(author)}
      ${authorBio}
      <div class="detail-actions">
        <a class="btn ghost" href="${escapeHtml(record.url)}" target="_blank" rel="noreferrer">Open Source</a>
        <button class="btn outline" id="copy-link">Copy Share Link</button>
      </div>
      <p class="excerpt">${escapeHtml(record.excerpt)}</p>
      <div class="meta">
        <div>Signed: ${escapeHtml(formatDate(record.createdAt))}</div>
        <div>Received: ${escapeHtml(formatDate(record.receivedAt))}</div>
        <div>Fingerprint: ${escapeHtml(record.fingerprint)}</div>
      </div>
      <div class="code">
        <div>Public Key</div>
        <pre>${escapeHtml(record.publicKey)}</pre>
        <div>Signature</div>
        <pre>${escapeHtml(record.signature)}</pre>
      </div>
    </div>
  `;

  const copyBtn = document.getElementById('copy-link');
  copyBtn?.addEventListener('click', async () => {
    const shareUrl = `${window.location.origin}/?id=${record.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      copyBtn.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Share Link';
      }, 1500);
    } catch {
      window.prompt('Copy share link:', shareUrl);
    }
  });
}

function applySort(items, sortBy) {
  const sorted = items.slice();
  if (sortBy === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  } else {
    sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
  return sorted;
}

async function loadVerified(query, sortBy) {
  try {
    const data = await fetchJson(`/api/signatures?query=${encodeURIComponent(query)}`);
    const items = applySort(data.items || [], sortBy);
    return { items, total: data.total || items.length };
  } catch (err) {
    return { items: [], total: 0, error: err.message };
  }
}

async function loadOpenFeed(query, sortBy) {
  try {
    const data = await fetchJson('/seed.json');
    const allowlist = Array.isArray(data.allowlist) ? data.allowlist : [];
    const blocklist = Array.isArray(data.blocklist) ? data.blocklist : [];
    const queryLower = query.toLowerCase();

    const filtered = (data.items || []).filter((item) => {
      const domain = getDomain(item.url);
      if (allowlist.length && !allowlist.some((allowed) => domain.endsWith(allowed))) return false;
      if (blocklist.length && blocklist.some((blocked) => domain.endsWith(blocked))) return false;
      if (!queryLower) return true;
      const haystack = `${item.title} ${item.excerpt} ${item.url}`.toLowerCase();
      return haystack.includes(queryLower);
    });

    const items = applySort(filtered, sortBy);
    return { items, total: items.length, generatedAt: data.generatedAt };
  } catch (err) {
    return { items: [], total: 0, error: err.message };
  }
}

function updateStats(verifiedTotal, openTotal) {
  statsEl.innerHTML = `
    <div class="stat">
      <div class="stat-value">${verifiedTotal}</div>
      <div class="stat-label">Verified</div>
    </div>
    <div class="stat">
      <div class="stat-value">${openTotal}</div>
      <div class="stat-label">Open Feed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${verifiedTotal + openTotal}</div>
      <div class="stat-label">Total</div>
    </div>
  `;
}

function updateInsights(verifiedItems, openItems) {
  const topAuthors = new Map();
  verifiedItems.forEach((item) => {
    const author = item.author?.name || item.author?.handle;
    if (!author) return;
    topAuthors.set(author, (topAuthors.get(author) || 0) + 1);
  });

  const topAuthorList = Array.from(topAuthors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `<li>${escapeHtml(name)} (${count})</li>`)
    .join('');

  const domains = [...new Set(openItems.map((item) => getDomain(item.url)).filter(Boolean))]
    .slice(0, 5)
    .map((domain) => `<li>${escapeHtml(domain)}</li>`)
    .join('');

  insightsEl.innerHTML = `
    <div class="insight-card">
      <div class="insight-title">Top authors</div>
      <ul class="insight-list">${topAuthorList || '<li>No verified authors yet</li>'}</ul>
    </div>
    <div class="insight-card">
      <div class="insight-title">Open feed sources</div>
      <ul class="insight-list">${domains || '<li>No open feed sources yet</li>'}</ul>
    </div>
  `;
}

async function checkApiStatus() {
  try {
    await fetchJson('/api/health');
    signalStatusEl.textContent = 'Live';
    statusLineEl.textContent = 'API status: healthy';
  } catch {
    signalStatusEl.textContent = 'Degraded';
    statusLineEl.textContent = 'API status: unavailable';
  }
}

async function loadIndex() {
  const query = queryInput.value.trim();
  setStatus('Loading index...');

  const showVerified = verifiedToggle.checked;
  const showOpen = openToggle.checked;
  const sortBy = sortSelect.value;

  const [verified, open] = await Promise.all([
    showVerified ? loadVerified(query, sortBy) : Promise.resolve({ items: [], total: 0 }),
    showOpen ? loadOpenFeed(query, sortBy) : Promise.resolve({ items: [], total: 0 })
  ]);

  if (verified.error) {
    setStatus(`Verified feed error: ${verified.error}`, true);
  } else if (open.error) {
    setStatus(`Open feed error: ${open.error}`, true);
  } else {
    setStatus('');
  }

  renderList(verifiedListEl, verified.items, 'verified');
  renderList(openListEl, open.items, 'open');
  updateStats(verified.total, open.total);
  updateInsights(verified.items, open.items);
  verifiedCountEl.textContent = verified.total;
  openCountEl.textContent = open.total;

  const hasAny = verified.items.length || open.items.length;
  emptyStateEl.classList.toggle('hidden', Boolean(hasAny));
  detailEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');

  if (open.generatedAt) {
    statusLineEl.textContent = `Open feed updated: ${open.generatedAt}`;
  }

  savePrefs();
}

async function loadDetail(id) {
  try {
    const record = await fetchJson(`/api/signatures/${id}`);
    renderDetail(record);
  } catch (err) {
    detailEl.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

searchBtn.addEventListener('click', () => {
  window.history.replaceState({}, '', `/?query=${encodeURIComponent(queryInput.value.trim())}`);
  loadIndex();
});

clearBtn.addEventListener('click', () => {
  queryInput.value = '';
  window.history.replaceState({}, '', '/');
  loadIndex();
});

refreshBtn.addEventListener('click', loadIndex);

queryInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') searchBtn.click();
});

verifiedToggle.addEventListener('change', loadIndex);
openToggle.addEventListener('change', loadIndex);
sortSelect.addEventListener('change', loadIndex);
viewSelect.addEventListener('change', () => {
  resultsEl.classList.toggle('split', viewSelect.value === 'split');
  resultsEl.classList.toggle('stack', viewSelect.value === 'stack');
  savePrefs();
});

copyApiBtn?.addEventListener('click', async () => {
  const text = API_BASE;
  try {
    await navigator.clipboard.writeText(text);
    copyApiBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyApiBtn.textContent = 'Copy API Base';
    }, 1500);
  } catch {
    window.prompt('Copy API base:', text);
  }
});

const prefs = loadPrefs();
if (prefs.query) queryInput.value = prefs.query;
if (typeof prefs.verified === 'boolean') verifiedToggle.checked = prefs.verified;
if (typeof prefs.open === 'boolean') openToggle.checked = prefs.open;
if (prefs.sort) sortSelect.value = prefs.sort;
if (prefs.view) viewSelect.value = prefs.view;
resultsEl.classList.toggle('split', viewSelect.value === 'split');
resultsEl.classList.toggle('stack', viewSelect.value === 'stack');

checkApiStatus();

if (currentId) {
  loadDetail(currentId);
} else {
  const initialQuery = params.get('query');
  if (initialQuery) queryInput.value = initialQuery;
  loadIndex();
}
