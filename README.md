# Kurdish Translate Bot

A Telegram bot that translates text into Kurdish dialects (Sorani, Kurmanji, Badini) using Google Gemini. I started this in April 2026 as a followup to the web translation app I built in November 2025 — same idea, but in chat form.

## Status

Right now the bot:
- translates text into all 3 dialects (Sorani/Kurmanji/Badini), auto-detecting the source language
- per-user dialect setting via `/set` (stored in memory)
- runs via long polling (fine for local dev)

Coming up: daily limits, a proper deploy setup, and paid premium.

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
│   └── dialects.js      # source languages + target dialect definitions
└── .env.example
```