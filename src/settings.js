// Per-user settings, kept in memory for now.
// NOTE: this will NOT survive a server restart. Planning to move it to Redis
// once this lands on a real host.
const store = new Map();

const DEFAULTS = {
  dialect: "sorani", // which Kurdish dialect to translate into
};

function keyOf(userId) {
  return String(userId);
}

export function getSettings(userId) {
  const key = keyOf(userId);
  if (!store.has(key)) {
    store.set(key, { ...DEFAULTS });
  }
  return store.get(key);
}

export function setDialect(userId, dialectId) {
  const s = getSettings(userId);
  s.dialect = dialectId;
}