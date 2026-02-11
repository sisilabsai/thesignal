import { Redis } from '@upstash/redis';

const KV_KEY = 'signal:records';
const memoryStore = globalThis.__signalMemoryStore || { records: [] };
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

async function readRecords() {
  if (!redis) return memoryStore.records;
  const stored = await redis.get(KV_KEY);
  return Array.isArray(stored) ? stored : [];
}

async function writeRecords(records) {
  if (!redis) {
    memoryStore.records = records;
    return;
  }
  await redis.set(KV_KEY, records);
}

export async function getRecords() {
  return readRecords();
}

export async function setRecords(records) {
  await writeRecords(records);
}
