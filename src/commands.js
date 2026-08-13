// Command descriptions shown in the Telegram / menu. Registered at boot
// via setMyCommands (see server.js).
export const COMMANDS = [
  { command: "start", description: "Intro" },
  { command: "translate", description: "Translate a sentence (or reply)" },
  { command: "set", description: "Set dialect: sorani | kurmanji | badini" },
  { command: "dialects", description: "List dialects" },
  { command: "summarize", description: "Summarize a text" },
  { command: "save", description: "Save the last translation" },
  { command: "list", description: "Your saved translations" },
  { command: "del", description: "Delete a saved translation: /del 2" },
  { command: "stats", description: "Your usage / plan" },
  { command: "premium", description: "Unlimited — Stars or FIB/ZainCash/Qi/AsiaPay" },
  { command: "me", description: "Your settings" },
  { command: "help", description: "All commands" },
];