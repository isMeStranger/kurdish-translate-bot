# Kurdish Translate Bot

A Telegram bot that translates text into Kurdish dialects (Sorani, Kurmanji, Badini) using Google Gemini. I started this in April 2026 as a followup to the web translation app I built in November 2025 — same idea, but in chat form.

## Status

Right now the bot:
- translates text into all 3 dialects (Sorani/Kurmanji/Badini), auto-detecting the source language
- per-user dialect setting via `/set` (stored in memory)
- summaries via `/summarize` (same Gemini model)
- saves favorites: `/save`, `/list`, `/del`
- free tier: 20 translations/day/user, with a spam guard
- `/stats` shows your remaining usage
- runs via long polling (fine for local dev)

Coming up: a proper deploy setup (webhooks + serverless) and paid premium.

## Run it

```bash
npm install
cp .env.example .env   # fill in BOT_TOKEN + GEMINI_API_KEY
npm start
```

Get a bot token from [@BotFather](https://t.me/BotFather), an API key from [Google AI Studio](https://aistudio.google.com/).

## Files

```
├── src/
│   ├── bot.js           # telegram bot, commands + message handling
│   ├── translator.js    # Gemini calls (idiom detection in the prompt)
│   ├── settings.js      # per-user settings (in-memory)
│   ├── limits.js        # free tier daily limits + spam guard
│   ├── premium.js       # premium (placeholder for now)
│   └── dialects.js      # source languages + target dialect definitions
└── .env.example
```