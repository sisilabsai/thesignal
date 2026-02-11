import {
  ensureKeys,
  getFingerprint,
  getProfile,
  setProfile,
  getApiBase,
  setApiBase,
  sanitizeProfile
} from './lib/storage.js';

const nameInput = document.getElementById('profile-name');
const handleInput = document.getElementById('profile-handle');
const urlInput = document.getElementById('profile-url');
const bioInput = document.getElementById('profile-bio');
const profileStatus = document.getElementById('profile-status');
const apiBaseInput = document.getElementById('api-base');
const apiStatus = document.getElementById('api-status');
const fingerprintEl = document.getElementById('fingerprint');
const publicKeyEl = document.getElementById('public-key');
const keyStatus = document.getElementById('key-status');
const saveProfileBtn = document.getElementById('save-profile');
const saveApiBtn = document.getElementById('save-api');
const copyPublicBtn = document.getElementById('copy-public');
const copyFingerprintBtn = document.getElementById('copy-fingerprint');
const exportKeysBtn = document.getElementById('export-keys');

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.style.color = isError ? '#b00020' : '#444';
}

async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

async function loadOptions() {
  const profile = await getProfile();
  nameInput.value = profile.name || '';
  handleInput.value = profile.handle || '';
  urlInput.value = profile.url || '';
  bioInput.value = profile.bio || '';

  const apiBase = await getApiBase();
  apiBaseInput.value = apiBase || 'https://thesignal-rho.vercel.app';

  const keys = await ensureKeys();
  fingerprintEl.textContent = await getFingerprint();
  publicKeyEl.textContent = keys.publicKey;
}

saveProfileBtn.addEventListener('click', async () => {
  const profile = sanitizeProfile({
    name: nameInput.value,
    handle: handleInput.value,
    url: urlInput.value,
    bio: bioInput.value
  });
  await setProfile(profile);
  setStatus(profileStatus, 'Profile saved.');
});

saveApiBtn.addEventListener('click', async () => {
  await setApiBase(apiBaseInput.value);
  setStatus(apiStatus, 'API base saved.');
});

copyPublicBtn.addEventListener('click', async () => {
  const keys = await ensureKeys();
  const ok = await copyToClipboard(keys.publicKey);
  setStatus(keyStatus, ok ? 'Public key copied.' : 'Failed to copy.', !ok);
});

copyFingerprintBtn.addEventListener('click', async () => {
  const fingerprint = await getFingerprint();
  const ok = await copyToClipboard(fingerprint);
  setStatus(keyStatus, ok ? 'Fingerprint copied.' : 'Failed to copy.', !ok);
});

exportKeysBtn.addEventListener('click', async () => {
  const keys = await ensureKeys();
  const fingerprint = await getFingerprint();
  const exportPayload = {
    version: 'signal-v1',
    exportedAt: new Date().toISOString(),
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    fingerprint
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'the-signal-keys.json';
  link.click();
  URL.revokeObjectURL(url);
  setStatus(keyStatus, 'Key backup downloaded.');
});

loadOptions().catch((err) => setStatus(keyStatus, err.message, true));
