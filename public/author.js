const params = new URLSearchParams(window.location.search);
const fingerprint = params.get('fingerprint');

const profileCard = document.getElementById('profile-card');
const profileStats = document.getElementById('profile-stats');
const authorList = document.getElementById('author-list');
const authorCount = document.getElementById('author-count');

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

function renderProfile(author, total, fingerprintValue) {
  const name = author?.name || author?.handle || 'Unknown author';
  const url = author?.url ? `<div class="profile-meta">${escapeHtml(author.url)}</div>` : '';
  const bio = author?.bio ? `<p>${escapeHtml(author.bio)}</p>` : '<p class="muted">No bio yet.</p>';

  profileCard.innerHTML = `
    <div class="tag">Verified author</div>
    <h1>${escapeHtml(name)}</h1>
    ${url}
    ${bio}
    <div class="profile-actions">
      <a class="btn ghost" href="/">Back to index</a>
      <button class="btn outline" id="copy-fingerprint">Copy Fingerprint</button>
    </div>
  `;

  profileStats.innerHTML = `
    <h3>Profile stats</h3>
    <p class="profile-meta">Fingerprint</p>
    <code>${escapeHtml(fingerprintValue)}</code>
    <p class="profile-meta" style="margin-top: 12px;">Verified entries</p>
    <div class="stat-value">${total}</div>
  `;

  const copyBtn = document.getElementById('copy-fingerprint');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(fingerprintValue);
      copyBtn.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Fingerprint';
      }, 1500);
    } catch {
      window.prompt('Copy fingerprint:', fingerprintValue);
    }
  });
}

function renderList(items) {
  if (!items.length) {
    authorList.innerHTML = '<div class="empty">No entries yet.</div>';
    return;
  }

  authorList.innerHTML = items
    .map((item) => {
      return `
        <article class="card">
          <div class="card-header">
            <a class="title" href="/?id=${item.id}">${escapeHtml(item.title)}</a>
            <span class="label">Verified</span>
          </div>
          <div class="url">${escapeHtml(item.url)}</div>
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

async function loadAuthor() {
  if (!fingerprint) {
    profileCard.innerHTML = '<div class="error">Missing fingerprint.</div>';
    return;
  }

  try {
    const res = await fetch(`/api/authors/${encodeURIComponent(fingerprint)}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    renderProfile(data.author, data.total, data.fingerprint);
    authorCount.textContent = data.total;
    renderList(data.items || []);
  } catch (err) {
    profileCard.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

loadAuthor();
