import { test } from "node:test";
import assert from "node:assert/strict";

import { tierOf, badgesOf } from "../src/core/classifier.js";
import { vendorOf, VENDORS } from "../src/core/vendor.js";
import { effortsOf, effortLabel } from "../src/core/reasoning.js";
import { toChoices, toProviders, filterChoices } from "../src/core/catalog.js";

test("tierOf: reasoning keywords win over the generic bucket", () => {
  assert.equal(tierOf({ name: "DeepSeek-R1" }), "reasoning");
  assert.equal(tierOf({ name: "Gemini 4 Pro" }), "reasoning");
  assert.equal(tierOf({ name: "GPT-5 mini" }), "lite");
  assert.equal(tierOf({ name: "DeepSeek-V4" }), "flagship");
});

test("tierOf: reject list beats the reasoning regex", () => {
  // contains "pro" but is explicitly a fast model
  assert.equal(tierOf({ name: "Flash Pro" }), "lite");
});

test("badgesOf: derives at most two short badges", () => {
  assert.deepEqual(badgesOf({ name: "Gemini 4 Pro 1M" }), ["1M"]);
  assert.deepEqual(badgesOf({ name: "GPT-4o Vision" }), ["多模态"]);
  assert.deepEqual(badgesOf({ name: "Plain Model" }), []);
});

test("vendorOf: exact id, fuzzy id, then fallback to the provider name", () => {
  assert.equal(vendorOf("openai").label, "OpenAI");
  assert.equal(vendorOf("openai-compatible").label, "OpenAI");
  assert.equal(vendorOf("something-else", "My Gateway").label, "My Gateway");
  assert.equal(vendorOf("", "").label, VENDORS.default.label);
});

test("effortsOf: keeps the vendor's own names, never assumes Low/High by index", () => {
  const rows = effortsOf({
    reasoning: { efforts: [{ id: "l", name: "Minimal" }, { id: "h", name: "High" }] },
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.label), ["Minimal", "High"]);
  assert.equal(rows[0].sub, "极速响应");
  assert.equal(rows[1].sub, "平衡速度与推理");
  assert.deepEqual(rows.map((r) => r.bars), [2, 4]);
});

test("effortsOf / effortLabel: models without reasoning advertise a fixed depth", () => {
  assert.deepEqual(effortsOf({}), []);
  assert.equal(effortLabel({}, undefined), "固定深度");
  assert.equal(effortLabel(null, undefined), "固定深度");
});

test("effortLabel: falls back to defaultEffort and raw ids", () => {
  const choice = { reasoning: { efforts: [{ id: "a", name: "Low" }, { id: "b", name: "High" }], defaultEffort: "b" } };
  assert.equal(effortLabel(choice, undefined), "High");
  assert.equal(effortLabel(choice, "a"), "Low");
  assert.equal(effortLabel(choice, "zzz"), "zzz");
});

test("toChoices: joins vendor branding and classification", () => {
  const choices = toChoices([
    { id: "openai", name: "OpenAI", models: [{ id: "gpt-5-mini", name: "GPT-5 mini" }] },
  ]);
  assert.equal(choices.length, 1);
  assert.equal(choices[0].vendor.label, "OpenAI");
  assert.equal(choices[0].tier, "lite");
});

test("toProviders: appends ghost columns for expected vendors", () => {
  const choices = toChoices([{ id: "deepseek-official", name: "DeepSeek", models: [{ id: "v4", name: "DeepSeek-V4" }] }]);
  const providers = toProviders(choices);
  assert.equal(providers[0].models.length, 1);
  assert.ok(providers.some((column) => column.ghost), "expected vendor placeholder missing");
  assert.ok(!providers.some((column) => column.ghost && column.vendor.label === "DeepSeek"));
});

test("filterChoices: matches model, vendor and provider name", () => {
  const choices = toChoices([
    { id: "openai", name: "OpenAI", models: [{ id: "gpt-5", name: "GPT-5" }] },
    { id: "deepseek-official", name: "DeepSeek", models: [{ id: "v4", name: "DeepSeek-V4" }] },
  ]);
  assert.equal(filterChoices(choices, "").length, 2);
  assert.equal(filterChoices(choices, "gpt").length, 1);
  assert.equal(filterChoices(choices, "deep").length, 1);
  assert.equal(filterChoices(choices, "nothing").length, 0);
});
