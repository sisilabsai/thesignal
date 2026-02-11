import * as ed from '@noble/ed25519';
import {
  bytesToBase64,
  base64ToBytes,
  fingerprintFromPublicKey,
  normalizeText
} from '../../../../packages/shared/signing.mjs';

const storage = chrome.storage?.local;

export function storageGet(keys) {
  return new Promise((resolve) => {
    storage.get(keys, (items) => resolve(items));
  });
}

export function storageSet(items) {
  return new Promise((resolve) => {
    storage.set(items, () => resolve());
  });
}

export function sanitizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return {};
  const name = normalizeText(profile.name).slice(0, 80);
  const handle = normalizeText(profile.handle).slice(0, 40);
  const url = normalizeText(profile.url).slice(0, 200);
  const bio = normalizeText(profile.bio).slice(0, 280);
  return { name, handle, url, bio };
}

export async function ensureKeys() {
  const stored = await storageGet(['privateKey', 'publicKey']);
  if (stored.privateKey && stored.publicKey) return stored;

  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKey(privateKey);
  const encoded = {
    privateKey: bytesToBase64(privateKey),
    publicKey: bytesToBase64(publicKey)
  };
  await storageSet(encoded);
  return encoded;
}

export async function getFingerprint() {
  const stored = await ensureKeys();
  return fingerprintFromPublicKey(stored.publicKey);
}

export async function getProfile() {
  const stored = await storageGet(['authorProfile']);
  return sanitizeProfile(stored.authorProfile || {});
}

export async function setProfile(profile) {
  await storageSet({ authorProfile: sanitizeProfile(profile) });
}

export async function getApiBase() {
  const stored = await storageGet(['apiBase']);
  return normalizeText(stored.apiBase || '');
}

export async function setApiBase(apiBase) {
  await storageSet({ apiBase: normalizeText(apiBase) });
}

export function decodePrivateKey(base64Value) {
  return base64ToBytes(base64Value);
}
