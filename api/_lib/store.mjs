import { Redis } from '@upstash/redis';

const KV_KEYS = {
  records: 'signal:records',
  submissions: 'signal:submissions',
  alerts: 'signal:alerts'
};

const memoryStore = globalThis.__signalMemoryStore || {
  records: [],
  submissions: [],
  alerts: []
};
if (!globalThis.__signalMemoryStore) {
  globalThis.__signalMemoryStore = memoryStore;
}

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })
  : null;

async function readList(key, fallback = []) {
  if (!redis) return memoryStore[key] || fallback;
  const stored = await redis.get(key);
  return Array.isArray(stored) ? stored : fallback;
}

async function writeList(key, value) {
  if (!redis) {
    memoryStore[key] = value;
    return;
  }
  await redis.set(key, value);
}

export async function getRecords() {
  return readList(KV_KEYS.records, []);
}

export async function setRecords(records) {
  await writeList(KV_KEYS.records, records);
}

export async function getSubmissions() {
  return readList(KV_KEYS.submissions, []);
}

export async function addSubmission(submission) {
  const submissions = await getSubmissions();
  submissions.push(submission);
  await writeList(KV_KEYS.submissions, submissions);
  return submission;
}

export async function getAlerts() {
  return readList(KV_KEYS.alerts, []);
}

export async function setAlerts(alerts) {
  await writeList(KV_KEYS.alerts, alerts);
}
