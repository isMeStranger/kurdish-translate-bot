// The main bot. Long polling for now, will switch to webhooks before deploy.
import "dotenv/config";
import { Bot } from "grammy";
import { Translator } from "./translator.js";
import { DIALECTS } from "./dialects.js";
import {
  getSettings,
  setDialect,
  saveLast,
  getLast,
  addFavorite,
  listFavorites,
  removeFavorite,
} from "./settings.js";
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
      "• <code>/save</code> — keep the last translation\n" +
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
      "<code>/summarize &lt;text&gt;</code> — summarize a text\n" +
      "<code>/save</code> — save the last translation\n" +
      "<code>/list</code> — your saved translations\n" +
      "<code>/del &lt;n&gt;</code> — delete one (see /list)\n" +
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

// /summarize some text here
bot.command(["summarize", "sum"], async (ctx) => {
  const text = ctx.match.trim();
  if (!text) {
    await replyAsHtml(ctx, "Usage: <code>/summarize long text here...</code>");
    return;
  }
  if (isRateLimited(ctx.from.id)) {
    await replyAsHtml(ctx, "Slow down a bit, you're sending messages too fast.");
    return;
  }
  try {
    const summary = await translator.summarize(text);
    await replyAsHtml(ctx, "<b>Summary</b>\n\n" + escapeHtml(summary));
  } catch (err) {
    console.error("summarize failed:", err);
    await replyAsHtml(ctx, Translator.friendlyError(err));
  }
});

// ---- saved translations ----

bot.command("save", async (ctx) => {
  const last = getLast(ctx.from.id);
  if (!last) {
    await replyAsHtml(ctx, "Nothing to save yet. Translate something first!");
    return;
  }
  const count = addFavorite(ctx.from.id, last);
  await replyAsHtml(ctx, "Saved ✅ (you have " + count + " saved). See <code>/list</code>.");
});

bot.command("list", async (ctx) => {
  const favs = listFavorites(ctx.from.id);
  if (favs.length === 0) {
    await replyAsHtml(ctx, "No saved translations yet. Use <code>/save</code> after translating.");
    return;
  }
  let out = "<b>Your saved translations</b>\n";
  favs.slice(0, 10).forEach((fav, i) => {
    const snippet = fav.translation.length > 40
      ? fav.translation.slice(0, 40) + "…"
      : fav.translation;
    out += i + 1 + ". <b>" + dialectLabel(fav.dialect) + "</b> — " + escapeHtml(snippet) + "\n";
  });
  if (favs.length > 10) out += "\n… and " + (favs.length - 10) + " more.";
  out += "\n\nDelete with <code>/del &lt;n&gt;</code>";
  await replyAsHtml(ctx, out);
});

bot.command("del", async (ctx) => {
  const n = parseInt(ctx.match.trim(), 10);
  if (!n || n < 1) {
    await replyAsHtml(ctx, "Usage: <code>/del 2</code> (see numbered list in <code>/list</code>)");
    return;
  }
  const ok = removeFavorite(ctx.from.id, n - 1);
  await replyAsHtml(ctx, ok ? "Deleted." : "That number is not in your list.");
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
    saveLast(ctx.from.id, {
      text: text,
      translation: translated,
      dialect: settings.dialect,
    });
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