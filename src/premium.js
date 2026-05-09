// Placeholder for the premium subscription logic.
// Plan: sell Telegram Stars for unlimited translations for 30 days.
// Everybody is on the free plan until that lands.

export function hasPremium(_userId) {
  return false;
}

export function premiumInfo() {
  return {
    available: false,
    message:
      "Premium is coming soon. It will unlock unlimited translations for 30 days via Telegram Stars.",
  };
}