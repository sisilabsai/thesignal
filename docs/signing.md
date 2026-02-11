# Signing Format (MVP)

This MVP uses a simple, deterministic signing format to prove authorship without identity verification.

## Version

- `signal-v1`

## Canonical message

A canonical message string is built from the fields below in this exact order:

```
version:{version}
url:{url}
title:{title}
excerpt:{excerpt}
contentHash:{contentHash}
createdAt:{createdAt}
```

All values are normalized with:
- `\r\n` -> `\n`
- `trim()` on both ends

## Content hash

`contentHash` = SHA-256 hex digest of the normalized `excerpt`.

## Signature

- Ed25519 signature over the canonical message bytes (UTF-8).
- `publicKey` and `signature` are base64 encoded.

## Payload

```
{
  "version": "signal-v1",
  "url": "https://example.com/post",
  "title": "Example",
  "excerpt": "First 400 characters...",
  "contentHash": "<sha256-hex>",
  "createdAt": "2026-02-11T10:00:00.000Z",
  "publicKey": "<base64>",
  "signature": "<base64>"
}
```

## Author metadata (optional)

An optional `author` object may be included for display purposes:

```
"author": {
  "name": "Jane Doe",
  "handle": "@janedoe",
  "url": "https://example.com",
  "bio": "Short bio"
}
```

Author metadata is self-declared and is **not** part of the canonical message in this MVP.
