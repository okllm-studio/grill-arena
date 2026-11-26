import { test } from "node:test";
import assert from "node:assert/strict";
import { t, plural, catalogues } from "../public/i18n.js";

test("t fills the {placeholders} of an English text", () => {
  assert.equal(t("progress.step", { number: 2, settled: 3, remaining: 4 }), "Step 2 · 3 settled · ~4 to go");
});

test("t answers in English by default and when the language is unknown", () => {
  assert.equal(t("tab.facilitator"), "Facilitator");
  assert.equal(t("tab.facilitator", {}, "xx"), "Facilitator");
});

test("a key missing from a language falls back to English, never blank nor the key", () => {
  catalogues.xx = { "tab.current": "Étape" };
  try {
    assert.equal(t("tab.current", {}, "xx"), "Étape");
    assert.equal(t("tab.facilitator", {}, "xx"), "Facilitator");
  } finally {
    delete catalogues.xx;
  }
});

test("every key of the English catalogue exists in the French one, and vice versa", () => {
  const en = Object.keys(catalogues.en).sort();
  const fr = Object.keys(catalogues.fr ?? {}).sort();
  assert.deepEqual(en.filter((k) => !fr.includes(k)), [], "missing in French");
  assert.deepEqual(fr.filter((k) => !en.includes(k)), [], "missing in English");
});

test("French texts keep the placeholders of the English ones", () => {
  const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
  for (const [key, text] of Object.entries(catalogues.en)) {
    assert.deepEqual(placeholders(catalogues.fr?.[key] ?? ""), placeholders(text), key);
  }
});

test("in French, 0 and 1 take the singular", () => {
  assert.equal(plural(0, "noun.Point", "fr"), "0 point");
  assert.equal(plural(1, "noun.Point", "fr"), "1 point");
  assert.equal(plural(2, "noun.Point", "fr"), "2 points");
});

test("a negative count takes the form of its absolute value", () => {
  assert.equal(plural(-1, "noun.Point", "en"), "-1 Point");
  assert.equal(plural(-2, "noun.Point", "en"), "-2 Points");
  assert.equal(plural(-1, "noun.Point", "fr"), "-1 point");
});

test("plural picks the singular or plural form of a noun", () => {
  assert.equal(plural(1, "noun.Point"), "1 Point");
  assert.equal(plural(0, "noun.Point"), "0 Points");
  assert.equal(plural(2, "noun.abstention"), "2 abstentions");
});
