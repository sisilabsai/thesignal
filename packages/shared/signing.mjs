import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export const SIGNING_VERSION = 'signal-v1';

export function normalizeText(text) {
  return String(text ?? '').replace(/\r\n/g, '\n').trim();
}

export function computeContentHash(excerpt) {
  const normalized = normalizeText(excerpt);
  const bytes = new TextEncoder().encode(normalized);
  return bytesToHex(sha256(bytes));
}

export function canonicalMessage(payload) {
  const version = payload.version || SIGNING_VERSION;
  const url = normalizeText(payload.url);
  const title = normalizeText(payload.title);
  const excerpt = normalizeText(payload.excerpt);
  const contentHash = normalizeText(payload.contentHash);
  const createdAt = normalizeText(payload.createdAt);

  return [
    `version:${version}`,
    `url:${url}`,
    `title:${title}`,
    `excerpt:${excerpt}`,
    `contentHash:${contentHash}`,
    `createdAt:${createdAt}`
  ].join('\n');
}

export function messageBytes(payload) {
  return new TextEncoder().encode(canonicalMessage(payload));
}

export function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToBytes(base64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function fingerprintFromPublicKey(publicKeyBase64) {
  const bytes = base64ToBytes(publicKeyBase64);
  const digest = bytesToHex(sha256(bytes));
  return digest;
}
