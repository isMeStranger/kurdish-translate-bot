// Gemini translation logic. Lifted the prompt from the web translation app
// I made, including the idiom detection part which works really well for Kurdish.
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash"; // free tier model, better for idioms than 2.0-flash

// Needed for the AQ. api keys from AI Studio. Without this header they just fail.
function createClient(apiKey) {
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

// Gemini describes each dialect in its prompt slightly differently
const DIALECT_PROMPTS = {
  sorani: "Sorani Kurdish (Central Kurdish, written in Arabic script)",
  kurmanji: "Kurmanji Kurdish (Northern Kurdish, written in Latin script)",
  badini: "Badini Kurdish (Northern Kurdish, written in Arabic script)",
};

const SOURCE_LABELS = {
  english: "English",
  arabic: "Arabic",
  turkish: "Turkish",
  persian: "Persian (Farsi)",
  german: "German",
  french: "French",
  swedish: "Swedish",
};

// sourceId "auto" means: let Gemini guess the language of the text.
export function buildPrompt(sourceId, dialectId, text) {
  const dialect = DIALECT_PROMPTS[dialectId] || "Kurdish";
  const source = SOURCE_LABELS[sourceId];

  if (source) {
    return (
      "Translate the following " +
      source +
      " text to " +
      dialect +
      ". If the text contains an idiom, proverb, or figurative expression, provide the natural translation followed by a brief explanation in brackets [] in " +
      dialect +
      " clarifying the actual meaning. For regular text, just provide the translation. Reply with only the translated text (and bracketed explanations if needed).\n\n" +
      text
    );
  }

  // auto-detect path
  return (
    "Translate the following text to " +
    dialect +
    ". The text is written in one of: English, Arabic, Turkish, Persian (Farsi), German, French or Swedish — detect the source language yourself. If the text contains an idiom, proverb, or figurative expression, provide the natural translation followed by a brief explanation in brackets [] in " +
    dialect +
    " clarifying the actual meaning. For regular text, just provide the translation. Reply with only the translated text (and bracketed explanations if needed).\n\n" +
    text
  );
}

// Gemini 429 errors look like "…retry in 51s…". Pull the number out so we can
// tell the user how long to wait and retry once ourselves.
export function parseRetrySeconds(message) {
  if (!message) return null;
  const m = String(message).match(/retry in (\d+(?:\.\d+)?)s?/i);
  return m ? Math.ceil(parseFloat(m[1])) : null;
}

export class Translator {
  constructor(apiKey) {
    this.ai = createClient(apiKey);
  }

  // sourceId can be a specific language ("english", "arabic", ...) or "auto"
  async translate(text, sourceId, dialectId) {
    return this.generate(buildPrompt(sourceId || "auto", dialectId, text));
  }

  async summarize(text) {
    return this.generate(
      "Summarize the following text concisely while keeping the key meaning:\n\n" + text
    );
  }

  // shared call + one automatic retry on quota errors (with backoff)
  async generate(prompt) {
    let res;
    try {
      res = await this.ai.models.generateContent({ model: MODEL, contents: prompt });
    } catch (err) {
      const retry = parseRetrySeconds(err && err.message);
      if (retry) {
        console.warn("quota exceeded, retrying in " + retry + "s");
        await new Promise((r) => setTimeout(r, (retry + 1) * 1000));
        res = await this.ai.models.generateContent({ model: MODEL, contents: prompt });
      } else {
        throw err;
      }
    }
    return (res.text || "").trim();
  }

  // Try to figure out if a Gemini error is the daily quota thing,
  // so we can tell the user something nice instead of raw JSON.
  static friendlyError(err) {
    const msg = err && err.message ? err.message : "";
    if (msg.indexOf("quota") > -1 || msg.indexOf("RESOURCE_EXHAUSTED") > -1) {
      const retry = parseRetrySeconds(msg);
      if (retry) {
        return "Daily translation limit reached. Please wait " + retry + " seconds.";
      }
      return "Daily translation limit reached. Please try again later.";
    }
    return "Something went wrong. Please try again.";
  }
}