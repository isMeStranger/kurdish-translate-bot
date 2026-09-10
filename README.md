# Kurdish Translate Bot

A Telegram bot that translates text into Kurdish dialects (Sorani, Kurmanji, Badini) using Google Gemini. Started April 2026 as the chat version of my web translation app — same idea, same model, but portable to any phone, no app install.

## Features

- Translate into all 3 Kurdish dialects, source language **auto-detected**
- Idiom / proverb explanations in brackets (same prompt trick as the web app)
- Per-user dialect setting: `/set sorani|kurmanji|badini`
- Free tier: **20 translations/day/user** (UTC) + a per-user spam guard
- `/summarize` — summarize a long text with the same model
- Saved translations: `/save`, `/list`, `/del`
- **Inline mode** — type `@kurdish_translate_bot hello there` in any chat, pick the translation
- `/stats`, `/me`, `/dialects`
- **Webhook mode** for serverless production, **long polling** for local dev
- State in **Redis** (keys off with the memory fallback for dev)

## How it runs

```
Telegram ──webhook──▶  Cloud Run (this app) ──▶ Gemini API
                        │
                        └── state: Redis (Upstash) or in-memory
```

The single entry point `src/server.js` decides the mode:

- `WEBHOOK_URL` **set** → starts an Express server and registers the bot webhook
- `WEBHOOK_URL` **empty** → long polling (just open a private chat and message it)

## Run it

```bash
npm install
cp .env.example .env   # BOT_TOKEN + GEMINI_API_KEY are enough
npm run dev            # long polling mode
```

Get a token from [@BotFather](https://t.me/BotFather), a key from [Google AI Studio](https://aistudio.google.com/).

## Deploy (serverless — Cloud Run)

The bot is a container, so Cloud Run is the easiest fit (and it's the same vendor
as Gemini). It scales to zero, so it's basically free when no one is talking to it.

```bash
# build + deploy once, set env vars in the console
gcloud run deploy kurdish-translate-bot \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 0.5 \
  --max-instances 3 \
  --min-instances 0 \
  --set-env-vars GEMINI_API_KEY=...,BOT_TOKEN=...,REDIS_URL=...,WEBHOOK_SECRET=...

# point Telegram at it (fill WEBHOOK_URL in .env then run)
npm run set-webhook
```

Alternatives that work with the same codebase:

| Host | Mode | Notes |
|------|------|-------|
| Cloud Run | webhook | serverless container, scales to zero, ~free when idle |
| Railway / Fly.io | webhook or polling | always-on VM-ish, simple, ~$5/mo |
| Raspberry Pi / VPS | polling | cheapest; keep the box alive |

Telegram requires a public **HTTPS** endpoint for webhooks — all of the above
provide one for free.

## Files

```
├── src/
│   ├── server.js        # entry: chooses webhook vs polling, graceful shutdown
│   ├── bot.js           # all commands + message handling (the bot factory)
│   ├── translator.js    # Gemini calls (idiom detection, auto-detect source)
│   ├── store.js         # Redis or in-memory KV + user record helpers
│   ├── limits.js        # free tier daily limits + spam guard
│   └── dialects.js      # source languages + target dialect definitions
├── scripts/
│   └── set-webhook.js   # one-time: point Telegram at your public URL
├── test/
│   └── quota.test.js    # unit tests for the quota parser + prompt building
└── .env.example
```

## Roadmap

- [x] Unit tests for quota / prompt building
- [x] Inline mode (type the bot name to translate on the fly)
- [ ] Inline keyboards instead of typed `/set`