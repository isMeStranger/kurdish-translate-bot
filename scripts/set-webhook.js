// One-time script: point Telegram at your public webhook endpoint.
//   npm run set-webhook
import "dotenv/config";

const { BOT_TOKEN, WEBHOOK_URL, WEBHOOK_PATH, WEBHOOK_SECRET } = process.env;
if (!BOT_TOKEN || !WEBHOOK_URL) {
  console.error("BOT_TOKEN and WEBHOOK_URL must be set (see .env.example)");
  process.exit(1);
}

const url = WEBHOOK_URL.replace(/\/$/, "") + (WEBHOOK_PATH || "/webhook/kurdish-translate");

const body = {
  url,
  allowed_updates: ["message", "inline_query", "pre_checkout_query", "successful_payment"],
};
if (WEBHOOK_SECRET) body.secret_token = WEBHOOK_SECRET;

const res = await fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/setWebhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log(JSON.stringify(await res.json(), null, 2));