import { test } from "node:test";
import assert from "node:assert/strict";

import { seatBox, panelBox } from "../src/core/positioning.js";

test("seatBox: viewport mode passes rect through unchanged", () => {
  const box = seatBox({ left: 100, top: 200, width: 180, height: 28 }, { transformed: false, scrollX: 50, scrollY: 900 });
  assert.deepEqual(box, { position: "fixed", left: 100, top: 200, width: 180, height: 28 });
});

test("seatBox: document mode adds scroll offsets so absolute matches the viewport", () => {
  const box = seatBox({ left: 100, top: 200, width: 180, height: 28 }, { transformed: true, scrollX: 50, scrollY: 900 });
  assert.deepEqual(box, { position: "absolute", left: 150, top: 1100, width: 180, height: 28 });
});

test("panelBox: centres on the seat", () => {
  const box = panelBox({
    rect: { left: 500, top: 700, width: 200, height: 28 },
    panelWidth: 800,
    viewportWidth: 1400,
    viewportHeight: 900,
  });
  assert.equal(box.position, "fixed");
  assert.equal(box.left, 200);
  assert.equal(box.bottom, 212);
});

test("panelBox: clamps to the right edge", () => {
  const box = panelBox({
    rect: { left: 1200, top: 700, width: 200, height: 28 },
    panelWidth: 800,
    viewportWidth: 1400,
    viewportHeight: 900,
  });
  assert.equal(box.left, 586); // 1400 - 800 - 14
});

test("panelBox: clamps to the left edge in narrow windows", () => {
  const box = panelBox({
    rect: { left: 40, top: 700, width: 120, height: 28 },
    panelWidth: 800,
    viewportWidth: 600,
    viewportHeight: 900,
  });
  assert.equal(box.left, 14);
});

test("panelBox: document mode anchors above the seat with the panel height", () => {
  const box = panelBox({
    rect: { left: 500, top: 700, width: 200, height: 28 },
    panelWidth: 800,
    panelHeight: 300,
    viewportWidth: 1400,
    viewportHeight: 900,
    transformed: true,
    scrollX: 0,
    scrollY: 1000,
  });
  assert.equal(box.position, "absolute");
  assert.equal(box.top, 700 + 1000 - 12 - 300);
  assert.equal(box.bottom, null);
});
