# Kurdish Translate Bot

A Telegram bot that translates text into Kurdish dialects (Sorani, Kurmanji, Badini) using Google Gemini. I started this in April 2026 as a followup to the web translation app I built in November 2025 — same idea, but in chat form.

## Status

Right now the bot:
- translates text to **Sorani** (default) via `/translate` or just sending a message
- runs via long polling (fine for local dev)

More dialects, settings, and a proper deploy setup are coming as I go.

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
│   └── dialects.js      # source languages + target dialect definitions
└── .env.example
```