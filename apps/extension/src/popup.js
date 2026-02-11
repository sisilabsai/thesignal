import * as ed from '@noble/ed25519';
import {
  SIGNING_VERSION,
  computeContentHash,
  messageBytes,
  bytesToBase64,
  normalizeText
} from '../../../packages/shared/signing.mjs';
import {
  ensureKeys,
  getProfile,
  getApiBase,
  setApiBase,
  decodePrivateKey
} from './lib/storage.js';

const apiBaseInput = document.getElementById('api-base');
const pageUrlInput = document.getElementById('page-url');
const pageTitleInput = document.getElementById('page-title');
const pageExcerptInput = document.getElementById('page-excerpt');
const statusEl = document.getElementById('status');
const signBtn = document.getElementById('sign');
const openIndexBtn = document.getElementById('open-index');
const authorEl = document.getElementById('author');
const optionsBtn = document.getElementById('open-options');
const excerptCountEl = document.getElementById('excerpt-count');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00020' : '#444';
}

function updateExcerptCount() {
  if (!excerptCountEl) return;
  const length = (pageExcerptInput.value || '').length;
  excerptCountEl.textContent = `${length}/2000`;
  excerptCountEl.style.color = length > 2000 ? '#b00020' : '#666';
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs?.[0]);
    });
  });
}

async function requestPageData(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_DATA' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response);
    });
  });
}

function isRestrictedUrl(url) {
  return /^(chrome|edge|about|chrome-extension|moz-extension):/i.test(url || '');
}

async function loadDefaults() {
  const apiBase = await getApiBase();
  apiBaseInput.value = apiBase || 'https://thesignal-rho.vercel.app';

  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    setStatus('No active tab found.', true);
    return;
  }

  if (isRestrictedUrl(tab.url)) {
    setStatus('This page cannot be accessed. Open a normal web page.', true);
    signBtn.disabled = true;
    return;
  }

  const data = await requestPageData(tab.id);
  if (!data) {
    setStatus('Could not read the page. Try refreshing the tab.', true);
    return;
  }

  if (data.error) {
    setStatus('This page blocks access. Try another page.', true);
    signBtn.disabled = true;
    return;
  }

  pageUrlInput.value = data.url || '';
  pageTitleInput.value = data.title || '';
  pageExcerptInput.value = data.excerpt || '';
  updateExcerptCount();

  const profile = await getProfile();
  if (authorEl) {
    authorEl.textContent = profile.name || profile.handle || 'Not set';
  }
}

async function signAndPublish() {
  setStatus('Signing...');
  const apiBase = normalizeText(apiBaseInput.value || '');
  if (!apiBase) {
    setStatus('API base URL is required.', true);
    return;
  }

  await setApiBase(apiBase);

  const url = normalizeText(pageUrlInput.value);
  const title = normalizeText(pageTitleInput.value);
  const excerpt = normalizeText(pageExcerptInput.value);

  if (!url || !title || !excerpt) {
    setStatus('URL, title, and excerpt are required.', true);
    return;
  }

  const createdAt = new Date().toISOString();
  const contentHash = computeContentHash(excerpt);

  const authorProfile = await getProfile();
  const hasAuthorProfile = Object.values(authorProfile).some((value) => value);

  const payload = {
    version: SIGNING_VERSION,
    url,
    title,
    excerpt,
    contentHash,
    createdAt,
    author: hasAuthorProfile ? authorProfile : undefined
  };

  const keys = await ensureKeys();
  const signatureBytes = await ed.signAsync(messageBytes(payload), decodePrivateKey(keys.privateKey));
  const signature = bytesToBase64(signatureBytes);

  const response = await fetch(`${apiBase}/api/signatures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      publicKey: keys.publicKey,
      signature
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    setStatus(`Publish failed: ${err.error || response.status}`, true);
    return;
  }

  const result = await response.json().catch(() => ({}));
  if (result.duplicate) {
    setStatus('Already published. No changes made.');
  } else {
    setStatus('Published to The Signal index.');
  }
}

signBtn.addEventListener('click', () => {
  signAndPublish().catch((err) => setStatus(err.message, true));
});

pageExcerptInput.addEventListener('input', updateExcerptCount);

openIndexBtn.addEventListener('click', async () => {
  const apiBase = normalizeText(apiBaseInput.value || 'https://thesignal-rho.vercel.app');
  await setApiBase(apiBase);
  chrome.tabs.create({ url: apiBase });
});

optionsBtn?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

loadDefaults().catch((err) => setStatus(err.message, true));
