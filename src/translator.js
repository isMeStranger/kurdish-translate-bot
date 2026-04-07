// Gemini translation logic. Lifted the prompt from the web translation app
// I made, including the idiom detection part which works really well for Kurdish.
import { GoogleGenAI } from "@google/genai";
import { DIALECTS } from "./dialects.js";

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

function buildPrompt(sourceLabel, dialectId, text) {
  const dialect = DIALECT_PROMPTS[dialectId] || "Kurdish";
  return (
    "Translate the following " +
    sourceLabel +
    " text to " +
    dialect +
    ". If the text contains an idiom, proverb, or figurative expression, provide the natural translation followed by a brief explanation in brackets [] in " +
    dialect +
    " clarifying the actual meaning. For regular text, just provide the translation. Reply with only the translated text (and bracketed explanations if needed).\n\n" +
    text
  );
}

const SOURCE_LABELS = {
  english: "English",
  arabic: "Arabic",
  turkish: "Turkish",
  persian: "Persian (Farsi)",
  german: "German",
  french: "French",
  swedish: "Swedish",
};

export class Translator {
  constructor(apiKey) {
    this.ai = createClient(apiKey);
  }

  async translate(text, sourceId, dialectId) {
    const sourceLabel = SOURCE_LABELS[sourceId] || "English";
    const prompt = buildPrompt(sourceLabel, dialectId, text);

    const res = await this.ai.models.generateContent({
      model: "gemini-2.5-flash", // free tier model, better for idioms than 2.0-flash
      contents: prompt,
    });

    return (res.text || "").trim();
  }

  // Try to figure out if a Gemini error is the daily quota thing,
  // so we can tell the user something nice instead of raw JSON.
  static friendlyError(err) {
    const msg = err && err.message ? err.message : "";
    if (msg.indexOf("quota") > -1 || msg.indexOf("RESOURCE_EXHAUSTED") > -1) {
      return "Daily translation limit reached. Please try again later or upgrade.";
    }
    return "Something went wrong. Please try again.";
  }
}

export { DIALECTS };