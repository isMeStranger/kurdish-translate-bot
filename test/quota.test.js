// Small unit tests for the pieces that are easy to test without a network.
import test from "node:test";
import assert from "node:assert/strict";
import { parseRetrySeconds, buildPrompt } from "../src/translator.js";

test("parseRetrySeconds finds the retry time", () => {
  assert.equal(parseRetrySeconds("RESOURCE_EXHAUSTED: retry in 51s"), 51);
  assert.equal(parseRetrySeconds("too fast, retry in 120 seconds"), 120);
});

test("parseRetrySeconds rounds decimals up", () => {
  assert.equal(parseRetrySeconds("retry in 1.2s"), 2);
});

test("parseRetrySeconds returns null when not a quota message", () => {
  assert.equal(parseRetrySeconds("something else broke"), null);
  assert.equal(parseRetrySeconds(null), null);
});

test("buildPrompt mentions the requested dialect", () => {
  const prompt = buildPrompt("auto", "sorani", "hello there");
  assert.ok(prompt.includes("Sorani Kurdish"));
  assert.ok(prompt.includes("hello there"));
});

test("buildPrompt uses explicit source label when given", () => {
  const prompt = buildPrompt("english", "kurmanji", "good morning");
  assert.ok(prompt.includes("English"));
  assert.ok(prompt.includes("Kurmanji Kurdish"));
});