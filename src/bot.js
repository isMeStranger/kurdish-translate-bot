// The main bot. Long polling for now, will switch to webhooks before deploy.
import "dotenv/config";
import { Bot } from "grammy";
import { Translator } from "./translator.js";
import { DIALECTS } from "./dialects.js";
import { getSettings, setDialect } from "./settings.js";
import { FREE_DAILY_LIMIT, remainingToday, usedToday, incrementUsage, isRateLimited } from "./limits.js";
import { premiumInfo } from "./premium.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set. Get one from Google AI Studio.");
  process.exit(1);
}

const bot = new Bot(token);
const translator = new Translator(apiKey);

async function replyAsHtml(ctx, html) {
  await ctx.reply(html, { parse_mode: "HTML" });
}

function dialectLabel(id) {
  const d = DIALECTS[id];
  return d ? d.name + " (" + d.native + ")" : "Kurdish";
}

bot.command("start", async (ctx) => {
  const settings = getSettings(ctx.from.id);
  await replyAsHtml(
    ctx,
    "<b>Kurdish Translator</b> 🏳️\n\n" +
      "Send me any sentence and I will translate it into Kurdish for you.\n\n" +
      "• <code>/translate &lt;text&gt;</code> — translate a sentence\n" +
      "• <code>/set &lt;dialect&gt;</code> — choose Sorani / Kurmanji / Badini\n" +
      "• just send a message, I'll auto-detect the language\n\n" +
      "Currently translating into <b>" +
      dialectLabel(settings.dialect) +
      "</b>"
  );
});

bot.command(["help", "h"], async (ctx) => {
  await replyAsHtml(
    ctx,
    "<b>Commands</b>\n" +
      "<code>/start</code> — intro\n" +
      "<code>/help</code> — this message\n" +
      "<code>/translate &lt;text&gt;</code> — translate (or reply to a message)\n" +
      "<code>/set &lt;dialect&gt;</code> — set target dialect\n" +
      "<code>/dialects</code> — list dialects\n" +
      "<code>/stats</code> — your free tier usage\n" +
      "<code>/premium</code> — about unlimited\n" +
      "<code>/me</code> — your current settings"
  );
});

bot.command("dialects", async (ctx) => {
  let lines = "<b>Kurdish dialects</b>\n";
  for (const id of Object.keys(DIALECTS)) {
    const d = DIALECTS[id];
    lines += "• <code>" + id + "</code> — " + d.name + " — " + d.hint + "\n";
  }
  await replyAsHtml(ctx, lines);
});

// /set sorani | kurmanji | badini
bot.command("set", async (ctx) => {
  const choice = ctx.match.trim().toLowerCase();
  if (!DIALECTS[choice]) {
    await replyAsHtml(
      ctx,
      "Unknown dialect: <code>" + escapeHtml(choice) + "</code>\n\n" +
        "Available: <code>sorani</code>, <code>kurmanji</code>, <code>badini</code>"
    );
    return;
  }
  setDialect(ctx.from.id, choice);
  await replyAsHtml(ctx, "OK, now translating into <b>" + dialectLabel(choice) + "</b>.");
});

bot.command("me", async (ctx) => {
  const settings = getSettings(ctx.from.id);
  await replyAsHtml(ctx, "• Dialect: <b>" + dialectLabel(settings.dialect) + "</b>\n• Source: <b>auto</b>");
});

bot.command("stats", async (ctx) => {
  const used = usedToday(ctx.from.id);
  await replyAsHtml(
    ctx,
    "Free tier usage today (UTC): <b>" +
      used +
      "</b>/<b>" +
      FREE_DAILY_LIMIT +
      "</b> translations.\n" +
      remainingToday(ctx.from.id) +
      " left."
  );
});

bot.command("premium", async (ctx) => {
  await replyAsHtml(ctx, premiumInfo().message);
});

// /translate some text here
bot.command(["translate", "t"], async (ctx) => {
  const text = ctx.match.trim();
  if (!text) {
    await replyAsHtml(ctx, "Usage: <code>/translate Hello there</code>");
    return;
  }
  await doTranslate(ctx, text);
});

async function doTranslate(ctx, text) {
  if (isRateLimited(ctx.from.id)) {
    await replyAsHtml(ctx, "Slow down a bit, you're sending messages too fast.");
    return;
  }
  if (remainingToday(ctx.from.id) <= 0) {
    await replyAsHtml(
      ctx,
      "You've hit the free daily limit (" + FREE_DAILY_LIMIT + " translations). " +
        "Try again tomorrow, or check <code>/premium</code> for unlimited."
    );
    return;
  }

  const settings = getSettings(ctx.from.id);
  try {
    incrementUsage(ctx.from.id);
    const translated = await translator.translate(text, "auto", settings.dialect);
    await replyAsHtml(
      ctx,
      "→ <b>" + dialectLabel(settings.dialect) + "</b>\n\n" + escapeHtml(translated)
    );
  } catch (err) {
    console.error("translate failed:", err);
    await replyAsHtml(ctx, Translator.friendlyError(err));
  }
}

// bare text message = translate it. fast path for quick use.
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (!text) return;
  await doTranslate(ctx, text);
});

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

bot.catch((err) => {
  console.error("bot error:", err);
});

bot.start();
console.log("Kurdish Translator bot is running (long polling)...");