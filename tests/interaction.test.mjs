import { test } from "node:test";
import assert from "node:assert/strict";

import { overlayAction, dismissAction } from "../src/core/interaction.js";

test("overlayAction: an open tier bubble only closes itself", () => {
  assert.equal(overlayAction(true), "close-menu");
});

test("overlayAction: without a bubble the whole panel closes", () => {
  assert.equal(overlayAction(false), "close-panel");
});

test("dismissAction: inside the bubble nothing closes", () => {
  assert.equal(dismissAction("menu", true), "none");
  assert.equal(dismissAction("menu", false), "none");
});

test("dismissAction: inside the panel with an open bubble closes only the bubble", () => {
  assert.equal(dismissAction("panel", true), "close-menu");
});

test("dismissAction: inside the panel without a bubble leaves it alone", () => {
  assert.equal(dismissAction("panel", false), "none");
});

test("dismissAction: outside the panel closes everything", () => {
  assert.equal(dismissAction("outside", true), "close-panel");
  assert.equal(dismissAction("outside", false), "close-panel");
});
