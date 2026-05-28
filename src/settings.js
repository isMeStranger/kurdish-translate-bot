// Per-user settings, kept in memory for now.
// NOTE: this will NOT survive a server restart. Planning to move it to Redis
// once this lands on a real host.
const store = new Map();

const DEFAULTS = {
  dialect: "sorani", // which Kurdish dialect to translate into
  favorites: [], // saved translations, newest first (max 20)
};

function keyOf(userId) {
  return String(userId);
}

export function getSettings(userId) {
  const key = keyOf(userId);
  if (!store.has(key)) {
    store.set(key, { ...DEFAULTS, favorites: [] });
  }
  return store.get(key);
}

export function setDialect(userId, dialectId) {
  const s = getSettings(userId);
  s.dialect = dialectId;
}

// ---- last translation (so /save and /summarize have something to work on) ----

export function saveLast(userId, record) {
  const s = getSettings(userId);
  s.last = { ts: Date.now(), ...record };
}

export function getLast(userId) {
  return getSettings(userId).last || null;
}

// ---- saved favorites ----

export function addFavorite(userId, favorite) {
  const s = getSettings(userId);
  s.favorites.unshift(favorite);
  if (s.favorites.length > 20) s.favorites.length = 20;
  return s.favorites.length;
}

export function listFavorites(userId) {
  return getSettings(userId).favorites || [];
}

export function removeFavorite(userId, index) {
  const s = getSettings(userId);
  if (!s.favorites || index < 0 || index >= s.favorites.length) return false;
  s.favorites.splice(index, 1);
  return true;
}