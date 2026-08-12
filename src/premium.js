// Premium via Telegram Stars. Users pay Stars → we grant 30 days of
// unlimited translations. Telegram takes a cut, you withdraw the rest via
// Fragment as TON. Desktop/web buyers are worth ~30% more than mobile ones
// (the app stores eat theirs first).
//
// NOTE: successful_payment is only delivered as long as the bot answered
// pre_checkout_query with ok — see bot.js.
import { loadUser, saveUser } from "./store.js";

const PRICE_STARS = parseInt(process.env.PREMIUM_PRICE_STARS || "300", 10);
const PREMIUM_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function planLabel() {
  return PRICE_STARS + " ⭐ for " + PREMIUM_DAYS + " days";
}

export async function hasPremium(userId) {
  const user = await loadUser(userId);
  return !!(user.premiumUntil && user.premiumUntil > Date.now());
}

export function premiumUntilISO(userId) {
  return user.premiumUntil ? new Date(user.premiumUntil).toISOString().slice(0, 10) : null;
}

export async function grantPremium(userId) {
  const user = await loadUser(userId);
  user.premiumUntil = Date.now() + PREMIUM_DAYS * DAY_MS;
  await saveUser(userId, user);
  return user.premiumUntil;
}

// for the owner when a manual payment turns out to be a no-show
export async function revokePremium(userId) {
  const user = await loadUser(userId);
  user.premiumUntil = null;
  await saveUser(userId, user);
}

export function buildPremiumMessage() {
  return (
    "Premium gives you <b>unlimited translations</b> — no daily limit — for " +
    PREMIUM_DAYS +
    " days.\n\nPrice: <b>" +
    PRICE_STARS +
    " ⭐</b> (Telegram Stars). Pay inside Telegram, no card needed."
  );
}

// Telegram Stars invoice = createInvoiceLink with currency "XTR" and an
// empty provider_token. Works inside any chat.
export async function createInvoiceLink(bot) {
  return bot.api.createInvoiceLink({
    title: "Kurdish Translator Premium",
    description: "Unlimited translations for " + PREMIUM_DAYS + " days.",
    payload: "kurdish_premium_30d_v1",
    provider_token: "",
    currency: "XTR",
    prices: [{ label: PREMIUM_DAYS + " days premium", amount: PRICE_STARS }],
  });
}

export { PREMIUM_DAYS };