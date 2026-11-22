import { test } from "node:test";
import assert from "node:assert/strict";

import { clockDark, clockDarkNow } from "../src/core/theme.js";

test("clockDark: night hours are dark", () => {
  assert.equal(clockDark(0), true);
  assert.equal(clockDark(5), true);
  assert.equal(clockDark(18), true);
  assert.equal(clockDark(23), true);
});

test("clockDark: daytime hours are light", () => {
  assert.equal(clockDark(6), false);
  assert.equal(clockDark(12), false);
  assert.equal(clockDark(17), false);
});

test("clockDark: both boundaries are inclusive on the dark side", () => {
  assert.equal(clockDark(17), false);
  assert.equal(clockDark(18), true);
  assert.equal(clockDark(5), true);
  assert.equal(clockDark(6), false);
});

test("clockDark: garbage input falls back to light", () => {
  assert.equal(clockDark(Number.NaN), false);
});

test("clockDarkNow: reads the hour from a date", () => {
  assert.equal(clockDarkNow(new Date(2026, 10, 23, 21, 30)), true);
  assert.equal(clockDarkNow(new Date(2026, 10, 23, 9, 0)), false);
});
