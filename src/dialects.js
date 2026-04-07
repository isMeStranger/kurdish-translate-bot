// Source languages we accept. Same idea as the web app I built before this bot.
const LANGUAGES = [
  { id: "english", label: "English" },
  { id: "arabic", label: "Arabic" },
  { id: "turkish", label: "Turkish" },
  { id: "persian", label: "Persian (Farsi)" },
  { id: "german", label: "German" },
  { id: "french", label: "French" },
  { id: "swedish", label: "Swedish" },
];

// Target Kurdish dialects. value matches the dropdowns in the web app.
const DIALECTS = {
  sorani: {
    id: "sorani",
    name: "Sorani",
    script: "Arabic",
    native: "سۆرانی",
    hint: "Central Kurdish, Arabic script",
  },
  kurmanji: {
    id: "kurmanji",
    name: "Kurmanji",
    script: "Latin",
    native: "Kurmancî",
    hint: "Northern Kurdish, Latin script",
  },
  badini: {
    id: "badini",
    name: "Badini",
    script: "Arabic",
    native: "بادینی",
    hint: "Northern Kurdish, Arabic script",
  },
};

const DEFAULT_DIALECT = "sorani";

export { LANGUAGES, DIALECTS, DEFAULT_DIALECT };