// Key-value store abstraction so the bot works both with in-memory state
// (local dev) and with Redis (production / serverless, since the process
// is not guaranteed to stay alive between webhook calls).
import Redis from "ioredis";

async function createStore() {
  const url = process.env.REDIS_URL;
  if (url) {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true, // only actually connect on first command
    });
    return new RedisStore(client);
  }
  console.log("REDIS_URL not set — using in-memory store. State resets on restart.");
  return new MemoryStore();
}

// simple expiration check so stale memory entries don't linger forever
class MemoryStore {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds) {
    this.data.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key) {
    this.data.delete(key);
  }
}

class RedisStore {
  constructor(client) {
    this.client = client;
  }

  async get(key) {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async set(key, value, ttlSeconds) {
    const raw = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, raw, "EX", ttlSeconds);
    } else {
      await this.client.set(key, raw);
    }
  }

  async del(key) {
    await this.client.del(key);
  }
}

// ---- user record helpers ----

const PREFIX = "kurdish-translate:user:";

function userKey(userId) {
  return PREFIX + String(userId);
}

export function defaultUser() {
  return {
    dialect: "sorani",
    favorites: [],
    usage: {},
    premiumUntil: null, // ms timestamp when premium expires (null = never had it)
  };
}

export async function loadUser(userId) {
  const rec = await store.get(userKey(userId));
  if (!rec) return defaultUser();
  // make sure partial/old records still have all fields
  return { ...defaultUser(), ...rec };
}

export async function saveUser(userId, record) {
  await store.set(userKey(userId), record);
}

export const store = await createStore();