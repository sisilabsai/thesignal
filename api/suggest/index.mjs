import { applyCors } from '../_lib/cors.mjs';
import { sendJson, isValidUrl } from '../_lib/utils.mjs';

const MAX_LINKS = 12;
const MAX_SCAN_LINKS = 60;
const MAX_FEEDS = 2;
const MAX_SITEMAPS = 2;

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
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHost(hostname) {
  return hostname ? hostname.toLowerCase().replace(/^www\./, '') : '';
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

function isAllowedHost(hostname, baseHost) {
  const host = normalizeHost(hostname);
  const base = normalizeHost(baseHost);
  if (!host || !base) return false;
  return host === base || host.endsWith(`.${base}`);
}

function resolveCandidateUrl(candidate, baseUrl, baseHost) {
  if (!candidate) return null;
  let url;
  try {
    url = new URL(candidate, baseUrl);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (isPrivateHost(url.hostname)) return null;
  if (!isAllowedHost(url.hostname, baseHost)) return null;
  url.hash = '';
  return url.toString();
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

function parseAttributes(tag) {
  const attrs = {};
  const attrRegex = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrRegex.exec(tag))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return attrs;
}

function extractLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const seen = new Set();
  const results = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  let match;

  while ((match = anchorRegex.exec(html)) && results.length < 300) {
    const href = match[1];
    if (!href || href.startsWith('#')) continue;
    let url;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol)) continue;
    if (!isAllowedHost(url.hostname, base.hostname)) continue;
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

  return results.sort((a, b) => b.score - a.score).slice(0, MAX_SCAN_LINKS);
}

function extractFeedUrls(html, baseUrl, baseHost) {
  const results = [];
  const linkRegex = /<link\b[^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html))) {
    const attrs = parseAttributes(match[0]);
    const rel = (attrs.rel || '').toLowerCase();
    const type = (attrs.type || '').toLowerCase();
    if (!rel.includes('alternate')) continue;
    if (!type.includes('rss') && !type.includes('atom') && !type.includes('xml')) continue;
    const resolved = resolveCandidateUrl(attrs.href, baseUrl, baseHost);
    if (resolved) results.push(resolved);
  }

  return Array.from(new Set(results)).slice(0, MAX_FEEDS);
}

function extractFeedLinks(xml, baseUrl, baseHost) {
  const items = [];
  const entryRegex = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) && items.length < 200) {
    const chunk = entryMatch[0];
    const titleMatch = chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : '';

    let link = '';
    const linkTagRegex = /<link\b[^>]*>/gi;
    let tagMatch;
    while ((tagMatch = linkTagRegex.exec(chunk))) {
      const attrs = parseAttributes(tagMatch[0]);
      const rel = (attrs.rel || 'alternate').toLowerCase();
      if (rel.includes('self') || rel.includes('hub')) continue;
      if (attrs.href) {
        link = attrs.href;
        break;
      }
    }

    if (!link) {
      const linkTextMatch = chunk.match(/<link[^>]*>([^<]+)<\/link>/i);
      if (linkTextMatch) link = linkTextMatch[1].trim();
    }

    const resolved = resolveCandidateUrl(link, baseUrl, baseHost);
    if (!resolved) continue;
    items.push({ url: resolved, title: title || resolved, score: 6 });
  }

  return items;
}

function extractSitemapLinks(xml, baseUrl, baseHost) {
  const results = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;

  while ((match = locRegex.exec(xml)) && results.length < 400) {
    const loc = match[1].trim();
    const resolved = resolveCandidateUrl(loc, baseUrl, baseHost);
    if (!resolved) continue;
    const lower = resolved.toLowerCase();
    if (lower.endsWith('.xml') || lower.includes('sitemap')) continue;
    results.push({ url: resolved, title: resolved, score: 2 });
  }

  return results;
}

function extractSitemapUrlsFromRobots(text, baseUrl, baseHost) {
  if (!text) return [];
  const urls = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^sitemap:\s*(.+)$/i);
    if (!match) continue;
    const resolved = resolveCandidateUrl(match[1].trim(), baseUrl, baseHost);
    if (resolved && !resolved.endsWith('.gz')) urls.push(resolved);
  }
  return Array.from(new Set(urls));
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'TheSignalBot/1.0' }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mergeLinks(...lists) {
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    for (const item of list) {
      if (!item || !item.url) continue;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      merged.push(item);
    }
  }

  merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  return merged.slice(0, MAX_LINKS).map(({ url, title }) => ({ url, title }));
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

  const html = await fetchText(targetUrl.toString(), 6000);
  if (!html) {
    sendJson(res, 400, { error: 'Fetch failed' });
    return;
  }

  const { title, description } = extractMetadata(html);
  const anchorLinks = extractLinks(html, targetUrl.toString());
  const feedUrls = extractFeedUrls(html, targetUrl.toString(), targetUrl.hostname);
  const feedLinks = [];

  for (const feedUrl of feedUrls) {
    const feedXml = await fetchText(feedUrl, 4000);
    if (!feedXml) continue;
    feedLinks.push(...extractFeedLinks(feedXml, feedUrl, targetUrl.hostname));
  }

  let sitemapUrls = extractSitemapUrlsFromRobots(
    await fetchText(new URL('/robots.txt', targetUrl).toString(), 3000),
    targetUrl.toString(),
    targetUrl.hostname
  );

  if (!sitemapUrls.length) {
    sitemapUrls = [new URL('/sitemap.xml', targetUrl).toString()];
  }

  const sitemapLinks = [];
  for (const sitemapUrl of sitemapUrls.slice(0, MAX_SITEMAPS)) {
    const xml = await fetchText(sitemapUrl, 4000);
    if (!xml) continue;
    sitemapLinks.push(...extractSitemapLinks(xml, sitemapUrl, targetUrl.hostname));
  }

  const links = mergeLinks(feedLinks, anchorLinks, sitemapLinks);
  const suggestedCategories = suggestCategories(title, description, links);

  sendJson(res, 200, { title, description, links, suggestedCategories });
}
