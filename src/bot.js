// Simple first version of the bot. Only polling, only Sorani for now.
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { Translator } from "./translator.js";
import { DIALECTS, DEFAULT_DIALECT } from "./dialects.js";

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
const dialect = DIALECTS[DEFAULT_DIALECT];

// reel quick reply helper so the flow messages look a bit nicer
async function replyAsHtml(ctx, html) {
  await ctx.reply(html, { parse_mode: "HTML" });
}

bot.command("start", async (ctx) => {
  await replyAsHtml(
    ctx,
    "<b>Kurdish Translator</b> 🏳️\n\n" +
      "Send me any sentence and I will translate it into <b>" +
      dialect.name +
      "</b> (" +
      dialect.native +
      ").\n\n" +
      "• <code>/translate &lt;text&gt;</code> — translate something\n" +
      "• just type a message and I will handle it\n" +
      "• more dialects coming soon"
  );
});

bot.command(["help", "h"], async (ctx) => {
  await replyAsHtml(
    ctx,
    "<b>Commands</b>\n" +
      "<code>/start</code> — intro\n" +
      "<code>/help</code> — this message\n" +
      "<code>/translate &lt;text&gt;</code> — translate (or reply to a message)\n\n" +
      "Tip: you can also just send a message and I will translate it for you."
  );
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
  try {
    const translated = await translator.translate(text, "english", DEFAULT_DIALECT);
    await replyAsHtml(
      ctx,
      "<b>English</b> → <b>" + dialect.name + "</b> (" + dialect.native + ")\n\n" +
        escapeHtml(translated)
    );
  } catch (err) {
    console.error("translate failed:", err);
    await replyAsHtml(ctx, Translator.friendlyError(err));
  }
}

// bare text message = translate it. nice for quick use.
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

// Long polling for now. Will switch to webhook when I deploy it.
bot.catch((err) => {
  console.error("bot error:", err);
});

bot.start();
console.log("Kurdish Translator bot is running (long polling)...");