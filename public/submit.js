const form = document.getElementById('submit-form');
const statusEl = document.getElementById('submit-status');
const urlInput = document.getElementById('url');
const nameInput = document.getElementById('name');
const sampleInput = document.getElementById('sample');
const categoryInput = document.getElementById('category');
const categoryOtherInput = document.getElementById('category-other');
const chipContainer = document.getElementById('category-chips');
const scanBtn = document.getElementById('scan-btn');
const scanStatusEl = document.getElementById('scan-status');
const siteSummaryEl = document.getElementById('site-summary');
const suggestionListEl = document.getElementById('link-suggestions');
const suggestionEmptyEl = document.getElementById('suggestion-empty');

const CATEGORY_OPTIONS = [
  'Research',
  'Policy',
  'Technology',
  'Security',
  'AI',
  'Startups',
  'Economics',
  'Health',
  'Education',
  'Climate',
  'Culture',
  'Science'
];

const selectedCategories = new Set();
let scanTimeout = null;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00020' : '#5f5b54';
}

function setScanStatus(message, isError = false) {
  scanStatusEl.textContent = message;
  scanStatusEl.style.color = isError ? '#b00020' : '#5f5b54';
}

function normalizeCategory(value) {
  return value.trim();
}

function updateCategoryValue() {
  const custom = categoryOtherInput.value
    .split(',')
    .map((item) => normalizeCategory(item))
    .filter(Boolean);
  const all = Array.from(new Set([...selectedCategories, ...custom]));
  categoryInput.value = all.join(', ');
}

function renderChips() {
  chipContainer.innerHTML = '';
  CATEGORY_OPTIONS.forEach((label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.value = label;
    button.innerHTML = `<span>${label}</span><span class="chip-check">?</span>`;
    button.addEventListener('click', () => {
      if (selectedCategories.has(label)) {
        selectedCategories.delete(label);
        button.classList.remove('active');
      } else {
        selectedCategories.add(label);
        button.classList.add('active');
      }
      updateCategoryValue();
    });
    chipContainer.appendChild(button);
  });
}

function setSuggestedCategories(categories) {
  categories.forEach((category) => {
    if (!CATEGORY_OPTIONS.includes(category)) return;
    selectedCategories.add(category);
    const chip = chipContainer.querySelector(`[data-value="${category}"]`);
    chip?.classList.add('active');
  });
  updateCategoryValue();
}

function clearSuggestions() {
  suggestionListEl.innerHTML = '';
  suggestionEmptyEl.classList.remove('hidden');
  siteSummaryEl.classList.remove('active');
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function renderSuggestions(data) {
  suggestionListEl.innerHTML = '';
  if (!data.links || !data.links.length) {
    suggestionEmptyEl.classList.remove('hidden');
    return;
  }

  suggestionEmptyEl.classList.add('hidden');

  data.links.forEach((link) => {
    const item = document.createElement('li');
    item.className = 'suggestion-item';
    item.innerHTML = `
      <div class="suggestion-title">${link.title || link.url}</div>
      <div class="url">${link.url}</div>
      <div class="suggestion-actions">
        <button class="btn ghost" type="button" data-url="${link.url}">Use as sample</button>
        <a class="btn outline" href="${link.url}" target="_blank" rel="noreferrer">Open link</a>
      </div>
    `;
    item.querySelector('button')?.addEventListener('click', () => {
      sampleInput.value = link.url;
      setScanStatus('Sample URL filled in.');
    });
    suggestionListEl.appendChild(item);
  });
}

function renderSummary(data) {
  if (!data.title && !data.description) {
    siteSummaryEl.classList.remove('active');
    return;
  }
  siteSummaryEl.classList.add('active');
  siteSummaryEl.innerHTML = `
    <strong>${data.title || 'Site summary'}</strong>
    <p class="muted">${data.description || 'No description found.'}</p>
  `;
}

async function scanSite() {
  const url = urlInput.value.trim();
  if (!url) {
    setScanStatus('Enter a website URL to scan.', true);
    clearSuggestions();
    return;
  }

  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning...';
  setScanStatus('Scanning site for public links...');
  clearSuggestions();

  try {
    const data = await fetchJson(`/api/suggest?url=${encodeURIComponent(url)}`);
    setScanStatus(`Found ${data.links.length} public links.`);
    renderSummary(data);
    renderSuggestions(data);
    if (data.suggestedCategories?.length) {
      setSuggestedCategories(data.suggestedCategories);
    }
    if (!nameInput.value && data.title) {
      nameInput.value = data.title;
    }
  } catch (err) {
    setScanStatus(`Scan failed: ${err.message}`, true);
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan site';
  }
}

async function submitForm(event) {
  event.preventDefault();
  updateCategoryValue();

  const payload = {
    name: nameInput.value.trim(),
    url: urlInput.value.trim(),
    contactEmail: document.getElementById('contact').value.trim(),
    sampleUrl: sampleInput.value.trim(),
    category: categoryInput.value.trim(),
    notes: document.getElementById('notes').value.trim()
  };

  if (!payload.name || !payload.url || !payload.contactEmail) {
    setStatus('Name, URL, and contact email are required.', true);
    return;
  }

  setStatus('Submitting...');
  try {
    await fetchJson('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setStatus('Thanks! Your submission is in review.');
    form.reset();
    selectedCategories.clear();
    renderChips();
    clearSuggestions();
  } catch (err) {
    setStatus(`Submission failed: ${err.message}`, true);
  }
}

renderChips();
updateCategoryValue();
clearSuggestions();

form?.addEventListener('submit', submitForm);
scanBtn?.addEventListener('click', scanSite);
urlInput?.addEventListener('input', () => {
  if (scanTimeout) clearTimeout(scanTimeout);
  scanTimeout = setTimeout(() => {
    scanSite();
  }, 900);
});
categoryOtherInput?.addEventListener('input', updateCategoryValue);
