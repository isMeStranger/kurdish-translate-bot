// Free tier usage limits. Counts translations per user per day (UTC).
// The in-memory counters live inside the settings store, so they reset
// whenever the server restarts. Good enough for now.
import { getSettings } from "./settings.js";

const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || "20", 10);

function todayKey() {
  // 2026-05-09 (UTC)
  return new Date().toISOString().slice(0, 10);
}

export function usedToday(userId) {
  const s = getSettings(userId);
  return (s.usage || {})[todayKey()] || 0;
}

export function remainingToday(userId) {
  return Math.max(0, FREE_DAILY_LIMIT - usedToday(userId));
}

export function incrementUsage(userId) {
  const s = getSettings(userId);
  if (!s.usage) s.usage = {};
  const key = todayKey();
  s.usage[key] = (s.usage[key] || 0) + 1;
  return s.usage[key];
}

// super cheap per-user spam guard so people can't hammer the Gemini API
const lastMessageAt = new Map();

export function isRateLimited(userId) {
  const now = Date.now();
  const last = lastMessageAt.get(String(userId)) || 0;
  if (now - last < 1500) return true; // one message per 1.5s
  lastMessageAt.set(String(userId), now);
  return false;
}

export { FREE_DAILY_LIMIT };