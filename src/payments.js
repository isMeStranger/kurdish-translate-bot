// Manual payment options for people who can't (or won't) use Telegram Stars.
// The user contacts the owner, pays with their preferred method, the owner
// verifies the transfer and runs /grant <user_id> in the chat.
//
// No payment gateway API here — these are all "contact & send money" flows.
// If a provider ever exposes an official payout API, this module is where
// an auto-verifier would slot in.
export const PAYMENT_METHODS = [
  { id: "fib", name: "FIB", hint: "Fast internet banking (Iraq)" },
  { id: "zaincash", name: "ZainCash", hint: "Zain Iraq mobile wallet" },
  { id: "qi", name: "Qi Card", hint: "Qi Card payment card (Iraq)" },
  { id: "asiapay", name: "AsiaPay", hint: "AsiaCell mobile wallet" },
];

export function methodById(id) {
  return PAYMENT_METHODS.find((m) => m.id === id) || null;
}

// Same 30-day premium as the Stars tier. Adjust to whatever you want to charge.
// (placeholder-ish number — set it to something real when you launch)
export const PRICE_IQD = "10,000 IQD";

export function buildManualPayMessage(method) {
  return (
    "<b>Pay via " +
    method.name +
    "</b> (" +
    method.hint +
    ")\n\n" +
    "Send <b>" +
    PRICE_IQD +
    "</b> for 30 days of unlimited translations, then tap <b>“I've sent the money”</b>. " +
    "I'll check the transfer and activate premium right here in the chat.\n\n" +
    "• Amount: <b>" +
    PRICE_IQD +
    "</b>\n" +
    "• Duration: 30 days\n" +
    "• After paying, notify me below 👇"
  );
}