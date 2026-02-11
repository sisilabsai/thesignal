const listEl = document.getElementById('list');
const detailEl = document.getElementById('detail');
const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('search-btn');

const params = new URLSearchParams(window.location.search);
const currentId = params.get('id');

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

function renderAuthor(author) {
  if (!author) return '';
  const displayName = author.name || author.handle || 'Unknown';
  const handle = author.name && author.handle ? ` <span class="handle">${escapeHtml(author.handle)}</span>` : '';
  const url = author.url ? ` <span class="author-url">${escapeHtml(author.url)}</span>` : '';
  return `<div class="author">By ${escapeHtml(displayName)}${handle}${url}</div>`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function renderList(items) {
  if (!items.length) {
    listEl.innerHTML = '<div class="empty">No verified results yet.</div>';
    return;
  }

  listEl.innerHTML = items
    .map((item) => {
      return `
        <article class="card">
          <div class="card-header">
            <a class="title" href="?id=${item.id}">${escapeHtml(item.title)}</a>
            <span class="label">Human-Authored (self-attested)</span>
          </div>
          <div class="url">${escapeHtml(item.url)}</div>
          ${renderAuthor(item.author)}
          <p class="excerpt">${escapeHtml(item.excerpt)}</p>
          <div class="meta">
            <span>Signed: ${escapeHtml(formatDate(item.createdAt))}</span>
            <span>Fingerprint: ${escapeHtml(item.fingerprint.slice(0, 12))}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderDetail(record) {
  detailEl.classList.remove('hidden');
  listEl.classList.add('hidden');

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

async function loadList() {
  const query = encodeURIComponent(queryInput.value.trim());
  const data = await fetchJson(`/api/signatures?query=${query}`);
  renderList(data.items);
}

async function loadDetail(id) {
  const record = await fetchJson(`/api/signatures/${id}`);
  renderDetail(record);
}

searchBtn.addEventListener('click', () => {
  window.history.replaceState({}, '', `/?query=${encodeURIComponent(queryInput.value.trim())}`);
  loadList().catch((err) => {
    listEl.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  });
});

queryInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') searchBtn.click();
});

if (currentId) {
  loadDetail(currentId).catch((err) => {
    detailEl.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  });
} else {
  const initialQuery = params.get('query');
  if (initialQuery) queryInput.value = initialQuery;
  loadList().catch((err) => {
    listEl.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  });
}
