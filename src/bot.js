// The bot itself, as a factory. server.js decides whether we run it on
// webhooks (production) or long polling (local dev) and is the single entry
// point for both, so the deploy story stays simple.
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { Translator } from "./translator.js";
import { DIALECTS } from "./dialects.js";
import { loadUser, saveUser } from "./store.js";
import { FREE_DAILY_LIMIT, remainingToday, usedToday, incrementUsage, isRateLimited } from "./limits.js";
import {
  hasPremium,
  grantPremium,
  createInvoiceLink,
  buildPremiumMessage,
  planLabel,
} from "./premium.js";

export function buildBot() {
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
    const user = await loadUser(ctx.from.id);
    await replyAsHtml(
      ctx,
      "<b>Kurdish Translator</b> 🏳️\n\n" +
        "Send me any sentence and I will translate it into Kurdish for you.\n\n" +
        "• <code>/translate &lt;text&gt;</code> — translate a sentence\n" +
        "• <code>/set &lt;dialect&gt;</code> — choose Sorani / Kurmanji / Badini\n" +
        "• <code>/save</code> — keep the last translation\n" +
        "• just send a message, I'll auto-detect the language\n\n" +
        "Currently translating into <b>" +
        dialectLabel(user.dialect) +
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
    const user = await loadUser(ctx.from.id);
    user.dialect = choice;
    await saveUser(ctx.from.id, user);
    await replyAsHtml(ctx, "OK, now translating into <b>" + dialectLabel(choice) + "</b>.");
  });

  bot.command("me", async (ctx) => {
    const user = await loadUser(ctx.from.id);
    const premium = await hasPremium(ctx.from.id);
    const line =
      "• Dialect: <b>" + dialectLabel(user.dialect) + "</b>\n" +
      "• Source: <b>auto</b>\n" +
      "• Plan: <b>" + (premium ? "premium ✨" : "free") + "</b>";
    await replyAsHtml(ctx, line);
  });

  bot.command("stats", async (ctx) => {
    const used = await usedToday(ctx.from.id);
    const premium = await hasPremium(ctx.from.id);
    if (premium) {
      await replyAsHtml(
        ctx,
        "You're on <b>premium</b> ✨ — no daily limit. (usage today: " +
          used +
          " translations)"
      );
      return;
    }
    await replyAsHtml(
      ctx,
      "Free tier usage today (UTC): <b>" +
        used +
        "</b>/<b>" +
        FREE_DAILY_LIMIT +
        "</b> translations.\n" +
        (await remainingToday(ctx.from.id)) +
        " left."
    );
  });

  // ---- premium (Telegram Stars) ----

  bot.command("premium", async (ctx) => {
    const premium = await hasPremium(ctx.from.id);
    if (premium) {
      await replyAsHtml(ctx, "You're premium ✨ Thanks for supporting the bot!");
      return;
    }
    const link = await createInvoiceLink(bot);
    const keyboard = new InlineKeyboard().url("Pay " + planLabel() + " →", link);
    await replyAsHtml(ctx, buildPremiumMessage());
    await ctx.reply("Checkout:", {
      reply_markup: keyboard,
    });
  });

  // required: answer every pre-checkout, otherwise the payment never lands
  bot.on("pre_checkout_query", async (ctx) => {
    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on("message:successful_payment", async (ctx) => {
    const pay = ctx.message.successful_payment;
    const days = 30; // matches the invoice payload
    await grantPremium(ctx.from.id);
    console.log(
      "premium granted user=" + ctx.from.id + " stars=" + pay.total_amount
    );
    await replyAsHtml(
      ctx,
      "Payment received ✅ Premium is active for <b>" + days + " days</b>. No more daily limits!"
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
    const user = await loadUser(ctx.from.id);
    if (!user.last) {
      await replyAsHtml(ctx, "Nothing to save yet. Translate something first!");
      return;
    }
    user.favorites.unshift(user.last);
    if (user.favorites.length > 20) user.favorites.length = 20;
    await saveUser(ctx.from.id, user);
    await replyAsHtml(ctx, "Saved ✅ (you have " + user.favorites.length + " saved). See <code>/list</code>.");
  });

  bot.command("list", async (ctx) => {
    const user = await loadUser(ctx.from.id);
    if (!user.favorites || user.favorites.length === 0) {
      await replyAsHtml(ctx, "No saved translations yet. Use <code>/save</code> after translating.");
      return;
    }
    let out = "<b>Your saved translations</b>\n";
    user.favorites.slice(0, 10).forEach((fav, i) => {
      const snippet = fav.translation.length > 40
        ? fav.translation.slice(0, 40) + "…"
        : fav.translation;
      out += i + 1 + ". <b>" + dialectLabel(fav.dialect) + "</b> — " + escapeHtml(snippet) + "\n";
    });
    if (user.favorites.length > 10) out += "\n… and " + (user.favorites.length - 10) + " more.";
    out += "\n\nDelete with <code>/del &lt;n&gt;</code>";
    await replyAsHtml(ctx, out);
  });

  bot.command("del", async (ctx) => {
    const n = parseInt(ctx.match.trim(), 10);
    if (!n || n < 1) {
      await replyAsHtml(ctx, "Usage: <code>/del 2</code> (see numbered list in <code>/list</code>)");
      return;
    }
    const user = await loadUser(ctx.from.id);
    if (!user.favorites || n > user.favorites.length) {
      await replyAsHtml(ctx, "That number is not in your list.");
      return;
    }
    user.favorites.splice(n - 1, 1);
    await saveUser(ctx.from.id, user);
    await replyAsHtml(ctx, "Deleted.");
  });

  async function doTranslate(ctx, text) {
    if (isRateLimited(ctx.from.id)) {
      await replyAsHtml(ctx, "Slow down a bit, you're sending messages too fast.");
      return;
    }

    const premium = await hasPremium(ctx.from.id);
    if (!premium && (await remainingToday(ctx.from.id)) <= 0) {
      await replyAsHtml(
        ctx,
        "You've hit the free daily limit (" + FREE_DAILY_LIMIT + " translations). " +
          "Try again tomorrow, or check <code>/premium</code> for unlimited."
      );
      return;
    }

    const user = await loadUser(ctx.from.id);
    try {
      if (!premium) await incrementUsage(ctx.from.id);
      const translated = await translator.translate(text, "auto", user.dialect);
      user.last = {
        text: text,
        translation: translated,
        dialect: user.dialect,
        ts: Date.now(),
      };
      await saveUser(ctx.from.id, user);
      await replyAsHtml(
        ctx,
        "→ <b>" + dialectLabel(user.dialect) + "</b>\n\n" + escapeHtml(translated)
      );
    } catch (err) {
      console.error("translate failed:", err);
      await replyAsHtml(ctx, Translator.friendlyError(err));
    }
  }

  // ---- inline mode ----
  // type "@yourbot a sentence here" in any chat to get an inline translation.
  // (must be enabled in @BotFather → /setinline)
  bot.inlineQuery(/[\s\S]/, async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    if (!query) {
      await ctx.answerInlineQuery([], {
        switch_pm_text: "Write a sentence to translate",
        switch_pm_parameter: "inline",
      });
      return;
    }
    const user = await loadUser(ctx.inlineQuery.from.id);
    try {
      const translated = await translator.translate(query, "auto", user.dialect);
      await ctx.answerInlineQuery(
        [
          {
            type: "article",
            id: String(Date.now()),
            title: dialectLabel(user.dialect),
            description: query.slice(0, 60),
            input_message_content: { message_text: translated },
          },
        ],
        { is_personal: true, cache_time: 1 }
      );
    } catch (err) {
      console.error("inline translate failed:", err);
      await ctx.answerInlineQuery([], { is_personal: true });
    }
  });

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

  return bot;
}