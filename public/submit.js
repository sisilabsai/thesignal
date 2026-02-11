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
const previewTitleEl = document.getElementById('preview-title');
const previewDescEl = document.getElementById('preview-desc');
const captchaContainer = document.getElementById('captcha-container');
const honeypotInput = document.getElementById('company');

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
let previewTimeout = null;
let startedAt = new Date().toISOString();
let captchaEnabled = false;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00020' : '#5f5b54';
}

function setScanStatus(message, isError = false) {
  scanStatusEl.textContent = message;
  scanStatusEl.style.color = isError ? '#b00020' : '#5f5b54';
}

function setPreview(title, description) {
  previewTitleEl.textContent = title || 'No sample selected.';
  previewDescEl.textContent = description || '';
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
      previewSample(link.url);
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

async function previewSample(url) {
  if (!url) {
    setPreview('No sample selected.', '');
    return;
  }

  try {
    const data = await fetchJson(`/api/preview?url=${encodeURIComponent(url)}`);
    setPreview(data.title || 'Sample preview', data.description || 'No description found.');
    if (!nameInput.value && data.title) {
      nameInput.value = data.title;
    }
  } catch (err) {
    setPreview('Preview unavailable', err.message);
  }
}

async function loadCaptcha() {
  try {
    const res = await fetch('/config.json');
    if (!res.ok) return;
    const config = await res.json();
    if (!config.hcaptchaSiteKey) return;

    captchaEnabled = true;
    const script = document.createElement('script');
    script.src = 'https://js.hcaptcha.com/1/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    const widget = document.createElement('div');
    widget.className = 'h-captcha';
    widget.dataset.sitekey = config.hcaptchaSiteKey;
    captchaContainer.innerHTML = '';
    captchaContainer.appendChild(widget);
  } catch {
    // ignore
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
    notes: document.getElementById('notes').value.trim(),
    company: honeypotInput.value.trim(),
    startedAt
  };

  if (captchaEnabled) {
    const token = window.hcaptcha?.getResponse?.() || '';
    if (!token) {
      setStatus('Please complete the captcha.', true);
      return;
    }
    payload.captchaToken = token;
  }

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
    setPreview('No sample selected.', '');
    startedAt = new Date().toISOString();
    if (captchaEnabled) window.hcaptcha?.reset?.();
  } catch (err) {
    setStatus(`Submission failed: ${err.message}`, true);
  }
}

renderChips();
updateCategoryValue();
clearSuggestions();
setPreview('No sample selected.', '');
loadCaptcha();

form?.addEventListener('submit', submitForm);
scanBtn?.addEventListener('click', scanSite);
urlInput?.addEventListener('input', () => {
  if (scanTimeout) clearTimeout(scanTimeout);
  scanTimeout = setTimeout(() => {
    scanSite();
  }, 900);
});

sampleInput?.addEventListener('input', () => {
  if (previewTimeout) clearTimeout(previewTimeout);
  const sampleUrl = sampleInput.value.trim();
  previewTimeout = setTimeout(() => {
    previewSample(sampleUrl);
  }, 800);
});

categoryOtherInput?.addEventListener('input', updateCategoryValue);
