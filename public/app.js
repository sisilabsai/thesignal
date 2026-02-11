const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('search-btn');
const verifiedToggle = document.getElementById('filter-verified');
const openToggle = document.getElementById('filter-open');
const verifiedListEl = document.getElementById('verified-list');
const openListEl = document.getElementById('open-list');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const detailEl = document.getElementById('detail');
const emptyStateEl = document.getElementById('empty-state');
const resultsEl = document.querySelector('.results');
const copyApiBtn = document.getElementById('copy-api');

const params = new URLSearchParams(window.location.search);
const currentId = params.get('id');

const API_BASE = window.location.origin;

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
}

async function loadVerified(query) {
  try {
    const data = await fetchJson(`/api/signatures?query=${encodeURIComponent(query)}`);
    return { items: data.items || [], total: data.total || 0 };
  } catch (err) {
    return { items: [], total: 0, error: err.message };
  }
}

async function loadOpenFeed(query) {
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

    return { items: filtered, total: filtered.length };
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

async function loadIndex() {
  const query = queryInput.value.trim();
  setStatus('Loading index...');

  const showVerified = verifiedToggle.checked;
  const showOpen = openToggle.checked;

  const [verified, open] = await Promise.all([
    showVerified ? loadVerified(query) : Promise.resolve({ items: [], total: 0 }),
    showOpen ? loadOpenFeed(query) : Promise.resolve({ items: [], total: 0 })
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

  const hasAny = verified.items.length || open.items.length;
  emptyStateEl.classList.toggle('hidden', Boolean(hasAny));
  detailEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
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

queryInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') searchBtn.click();
});

verifiedToggle.addEventListener('change', loadIndex);
openToggle.addEventListener('change', loadIndex);

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

if (currentId) {
  loadDetail(currentId);
} else {
  const initialQuery = params.get('query');
  if (initialQuery) queryInput.value = initialQuery;
  loadIndex();
}
