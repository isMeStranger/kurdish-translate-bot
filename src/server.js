// Entry point. Decides between webhook mode (production, works on serverless
// like Cloud Run) and long polling mode (local dev).
import "dotenv/config";
import express from "express";
import { webhookCallback } from "grammy";
import { buildBot } from "./bot.js";
import { COMMANDS } from "./commands.js";

const bot = buildBot();

// publish the command menu once at boot; if it fails, it's not fatal
bot.api.setMyCommands(COMMANDS).catch((err) => {
  console.error("setMyCommands failed: " + err.message);
});

const PORT = parseInt(process.env.PORT || "8080", 10);

if (process.env.WEBHOOK_URL) {
  const path = process.env.WEBHOOK_PATH || "/webhook/kurdish-translate";
  const secret = process.env.WEBHOOK_SECRET;

  const app = express();
  app.use(express.json());

  // cheap request log so Cloud Run logs are readable
  app.use((req, _res, next) => {
    console.log(req.method + " " + req.path);
    next();
  });

  app.get("/", (_req, res) => res.send("Kurdish Translate Bot 🏳️"));
  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  // grammY verifies the X-Telegram-Bot-Api-Secret-Token header for us
  app.post(path, webhookCallback(bot, "express", { secretToken: secret }));

  app.post("*", (_req, res) => res.status(404).json({ error: "not found" }));

  app.listen(PORT, () => {
    console.log("webhook mode — listening on :" + PORT + path);
    console.log("webhook url: " + process.env.WEBHOOK_URL);
  });
} else {
  // local dev: long polling, no public URL needed
  bot.start();
  console.log("long polling mode");
}

// graceful shutdown so there are no hanging connections on deploys
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.once(sig, async () => {
    console.log("shutting down (" + sig + ")...");
    await bot.stop();
    process.exit(0);
  });
}