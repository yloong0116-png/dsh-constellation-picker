import { test } from "node:test";
import assert from "node:assert/strict";

import { overlayAction } from "../src/core/interaction.js";

test("overlayAction: an open tier bubble only closes itself", () => {
  assert.equal(overlayAction(true), "close-menu");
});

test("overlayAction: without a bubble the whole panel closes", () => {
  assert.equal(overlayAction(false), "close-panel");
});
