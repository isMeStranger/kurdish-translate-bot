// Free tier usage limits. Counts translations per user per day (UTC).
// Counters live in the store (Redis in prod, memory locally), so they do
// survive restarts in production.
import { loadUser, saveUser } from "./store.js";

const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || "20", 10);

function todayKey() {
  // 2026-06-12 (UTC)
  return new Date().toISOString().slice(0, 10);
}

export async function usedToday(userId) {
  const user = await loadUser(userId);
  return (user.usage || {})[todayKey()] || 0;
}

export async function remainingToday(userId) {
  return Math.max(0, FREE_DAILY_LIMIT - (await usedToday(userId)));
}

export async function incrementUsage(userId) {
  const user = await loadUser(userId);
  if (!user.usage) user.usage = {};
  const key = todayKey();
  user.usage[key] = (user.usage[key] || 0) + 1;
  await saveUser(userId, user);
  return user.usage[key];
}

// super cheap per-user spam guard so people can't hammer the Gemini API.
// in-memory on purpose: it only needs to protect one process.
const lastMessageAt = new Map();

export function isRateLimited(userId) {
  const now = Date.now();
  const last = lastMessageAt.get(String(userId)) || 0;
  if (now - last < 1500) return true; // one message per 1.5s
  lastMessageAt.set(String(userId), now);
  return false;
}

export { FREE_DAILY_LIMIT };