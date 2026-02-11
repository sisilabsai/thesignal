# The Signal MVP

This repo contains the first MVP for The Signal:
- Browser extension for signing and publishing content.
- Lightweight API server that verifies signatures and stores records.
- Simple public index UI.

## Quickstart

1. Install dependencies:
   - `npm install`

2. Start the API + public index:
   - `npm run dev`
   - Open `http://localhost:8787`

3. Build the extension:
   - `npm run build:extension`
   - Load `apps/extension/dist` as an unpacked extension in Chrome.

4. Sign a page:
   - Select text on any page.
   - Open the extension popup and click **Sign + Publish**.
   - View the result in the public index.

5. Configure options:
   - Open extension options to set your author profile and export keys.
   - Author metadata is self-declared and displayed in the public index.

## Production (Vercel)

- Public domain: `https://thesignal-rho.vercel.app`
- The extension defaults to the Vercel API base unless overridden in options.
- For persistence on Vercel, add an Upstash Redis integration and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- For email alerts and submissions, set SMTP env vars:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
  - `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - Optional: `SUBMISSIONS_NOTIFY` (where submission emails are sent)
- To send alerts, schedule a cron to POST `/api/alerts/run` (Vercel Cron or external scheduler).

## Data storage

Signed records are stored locally in `data/signatures.json`.

## Notes

- This MVP uses self-attestation and does not prove identity.
- Signatures are Ed25519 over a canonical message format.
- CORS is open for local development to support the extension.

See `docs/signing.md` for the canonical signing format.
