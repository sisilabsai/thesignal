import { applyCors } from '../_lib/cors.mjs';
import { sendJson, isValidUrl } from '../_lib/utils.mjs';

const MAX_LINKS = 12;
const CATEGORY_KEYWORDS = {
  Research: ['research', 'paper', 'journal', 'lab', 'publication'],
  Policy: ['policy', 'governance', 'regulation', 'law'],
  Technology: ['tech', 'engineering', 'developer', 'software'],
  Security: ['security', 'vulnerability', 'incident', 'threat'],
  AI: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'model'],
  Startups: ['startup', 'venture', 'funding', 'seed'],
  Economics: ['economics', 'finance', 'market'],
  Health: ['health', 'medicine', 'clinical'],
  Education: ['education', 'course', 'curriculum', 'learn'],
  Climate: ['climate', 'sustainability', 'environment'],
  Culture: ['culture', 'society', 'art'],
  Science: ['science', 'physics', 'biology', 'chemistry']
};

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

  return { title, description };
}

function extractLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const seen = new Set();
  const results = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  let match;

  while ((match = anchorRegex.exec(html)) && results.length < 200) {
    const href = match[1];
    if (!href || href.startsWith('#')) continue;
    let url;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol)) continue;
    if (url.hostname !== base.hostname) continue;
    url.hash = '';
    const normalized = url.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const text = stripTags(match[2]).slice(0, 120);
    const path = url.pathname.toLowerCase();
    let score = 0;
    if (path.includes('blog')) score += 3;
    if (path.includes('news') || path.includes('press')) score += 2;
    if (path.includes('docs') || path.includes('guide')) score += 2;
    if (path.includes('research') || path.includes('paper')) score += 3;
    if (path.split('/').filter(Boolean).length >= 2) score += 1;

    results.push({ url: normalized, title: text || normalized, score });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LINKS)
    .map(({ url, title }) => ({ url, title }));
}

function suggestCategories(title, description, links) {
  const haystack = `${title} ${description} ${links.map((link) => link.url).join(' ')}`.toLowerCase();
  const suggestions = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      suggestions.push(category);
    }
  }
  return suggestions.slice(0, 5);
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
    const { title, description } = extractMetadata(html);
    const links = extractLinks(html, targetUrl.toString());
    const suggestedCategories = suggestCategories(title, description, links);

    sendJson(res, 200, { title, description, links, suggestedCategories });
  } catch (err) {
    sendJson(res, 500, { error: err.name === 'AbortError' ? 'Fetch timed out' : 'Fetch failed' });
  } finally {
    clearTimeout(timer);
  }
}
