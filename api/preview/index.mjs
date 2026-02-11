import { applyCors } from '../_lib/cors.mjs';
import { sendJson, isValidUrl } from '../_lib/utils.mjs';

function stripTags(value) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function isPrivateHost(hostname) {
  if (!hostname) return true;
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.local')) return true;
  const ipMatch = lower.match(/^\d{1,3}(?:\.\d{1,3}){3}$/);
  if (!ipMatch) return false;
  const parts = lower.split('.').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function extractMetadata(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : '';

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const description = descMatch ? stripTags(descMatch[1]) : '';

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const ogTitle = ogTitleMatch ? stripTags(ogTitleMatch[1]) : '';

  return { title: ogTitle || title, description };
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = url.searchParams.get('url');
  if (!target || !isValidUrl(target)) {
    sendJson(res, 400, { error: 'Invalid url' });
    return;
  }

  const targetUrl = new URL(target);
  if (isPrivateHost(targetUrl.hostname)) {
    sendJson(res, 400, { error: 'Unsupported host' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'TheSignalBot/1.0' }
    });
    if (!response.ok) {
      sendJson(res, 400, { error: `Fetch failed: ${response.status}` });
      return;
    }

    const html = await response.text();
    const meta = extractMetadata(html);

    sendJson(res, 200, { ...meta, url: targetUrl.toString() });
  } catch (err) {
    sendJson(res, 500, { error: err.name === 'AbortError' ? 'Fetch timed out' : 'Fetch failed' });
  } finally {
    clearTimeout(timer);
  }
}
