import { test } from "node:test";
import assert from "node:assert/strict";

import { clockDark, clockDarkNow, colorLuminance, resolveTheme } from "../src/core/theme.js";

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

// ── host theme resolution ────────────────────────────────────────────────

function fakeDoc({ rootAttr, bodyAttr, rootClass = "", bodyClass = "", rootBg = "", bodyBg = "" }) {
  const el = (attr, cls, bg) => ({
    getAttribute: (name) => (name === "data-theme" || name === "data-color-mode" ? attr : null),
    className: cls,
    backgroundColor: bg,
    parentElement: null,
  });
  const root = el(rootAttr, rootClass, rootBg);
  const body = el(bodyAttr, bodyClass, bodyBg);
  body.parentElement = root;
  return { documentElement: root, body };
}

const winWith = (colors) => ({
  getComputedStyle: (el) => ({ backgroundColor: colors.get(el) || "rgba(0, 0, 0, 0)" }),
});

test("resolveTheme: data-theme wins", () => {
  assert.deepEqual(resolveTheme(fakeDoc({ rootAttr: "dark" }), winWith(new Map())), { dark: true, source: "attribute" });
  assert.deepEqual(resolveTheme(fakeDoc({ bodyAttr: "light" }), winWith(new Map())), { dark: false, source: "attribute" });
});

test("resolveTheme: theme class names are honoured", () => {
  assert.equal(resolveTheme(fakeDoc({ rootClass: "app theme-dark" }), winWith(new Map())).dark, true);
  assert.equal(resolveTheme(fakeDoc({ bodyClass: "theme-light" }), winWith(new Map())).dark, false);
});

test("resolveTheme: unrelated classes do not count", () => {
  const doc = fakeDoc({ rootClass: "app-container", bodyClass: "composer" });
  const theme = resolveTheme(doc, winWith(new Map()));
  assert.equal(theme.source, "default");
});

test("resolveTheme: falls back to background luminance", () => {
  const darkDoc = fakeDoc({ bodyBg: "rgb(20, 22, 26)" });
  const darkWin = winWith(new Map([[darkDoc.body, "rgb(20, 22, 26)"]]));
  assert.deepEqual(resolveTheme(darkDoc, darkWin), { dark: true, source: "background" });

  const lightDoc = fakeDoc({ bodyBg: "rgb(255, 255, 255)" });
  const lightWin = winWith(new Map([[lightDoc.body, "rgb(255, 255, 255)"]]));
  assert.deepEqual(resolveTheme(lightDoc, lightWin), { dark: false, source: "background" });
});

test("resolveTheme: transparent ancestors are skipped", () => {
  const doc = fakeDoc({});
  const win = winWith(new Map([[doc.documentElement, "rgb(10, 10, 12)"]]));
  assert.deepEqual(resolveTheme(doc, win), { dark: true, source: "background" });
});

test("resolveTheme: nothing detectable falls back to light", () => {
  assert.deepEqual(resolveTheme(fakeDoc({}), winWith(new Map())), { dark: false, source: "default" });
});

test("colorLuminance: transparent colours are ignored", () => {
  assert.equal(colorLuminance("rgba(0, 0, 0, 0)"), null);
  assert.equal(colorLuminance("rgba(0, 0, 0, 0.1)"), null);
  assert.ok(colorLuminance("rgba(0, 0, 0, 1)") < 0.1);
});
