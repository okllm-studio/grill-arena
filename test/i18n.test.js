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

test("plural picks the singular or plural form of a noun", () => {
  assert.equal(plural(1, "noun.Point"), "1 Point");
  assert.equal(plural(0, "noun.Point"), "0 Points");
  assert.equal(plural(2, "noun.abstention"), "2 abstentions");
});
