import { test } from "node:test";
import assert from "node:assert/strict";

import { createBurstGuard } from "../src/core/burst.js";
import { detectContainingBlock } from "../src/core/containing-block.js";

test("burst guard: DOM churn cannot keep the loop running indefinitely", () => {
  const guard = createBurstGuard(3, 800);
  let now = 0;
  for (let i = 0; i < 40; i += 1) {
    guard.next(now, 400, false); // streaming output: non-urgent, every 50ms
    now += 50;
  }
  // windows are 400ms long with 800ms cooldown: at 2000ms we can be at most in
  // the second window, never in an unbounded one.
  assert.ok(guard.until <= 2400, `window grew to ${guard.until}`);
});

test("burst guard: non-urgent signals respect the cooldown", () => {
  const guard = createBurstGuard(3, 800);
  assert.equal(guard.next(0, 500, false), 500);
  assert.equal(guard.next(600, 500, false), 500, "inside cooldown must not open a window");
  assert.equal(guard.next(1600, 500, false), 2100, "after cooldown a new window opens");
});

test("burst guard: urgent signals always extend", () => {
  const guard = createBurstGuard(1, 5000);
  assert.equal(guard.next(0, 500, true), 500);
  assert.equal(guard.next(100, 500, true), 600);
  assert.equal(guard.next(200, 500, true), 700);
});

test("burst guard: extension counter resets after the window expires", () => {
  const guard = createBurstGuard(2, 800);
  guard.next(0, 500, false);
  guard.next(100, 500, false);
  guard.next(200, 500, false);
  assert.equal(guard.until, 600); // limit=2: one extension after the opening window
  guard.next(2000, 300, false);
  assert.equal(guard.until, 2300);
});

test("containing block: plain html/body is safe", () => {
  const win = {
    getComputedStyle: () => ({ transform: "none", filter: "none", perspective: "none", willChange: "auto", contain: "none" }),
  };
  assert.equal(detectContainingBlock(win, { documentElement: {}, body: {} }), false);
});

test("containing block: transform on body is detected", () => {
  const win = {
    getComputedStyle: (el) => ({
      transform: el === "body" ? "translateY(0px)" : "none",
      filter: "none",
      perspective: "none",
      willChange: "auto",
      contain: "none",
    }),
  };
  assert.equal(detectContainingBlock(win, { documentElement: "html", body: "body" }), true);
});

test("containing block: filter / perspective / will-change / contain are detected", () => {
  const make = (cs) => ({
    getComputedStyle: () => ({ transform: "none", filter: "none", perspective: "none", willChange: "auto", contain: "none", ...cs }),
  });
  const doc = { documentElement: {}, body: {} };
  assert.equal(detectContainingBlock(make({ filter: "blur(2px)" }), doc), true);
  assert.equal(detectContainingBlock(make({ perspective: "800px" }), doc), true);
  assert.equal(detectContainingBlock(make({ willChange: "transform" }), doc), true);
  assert.equal(detectContainingBlock(make({ contain: "paint" }), doc), true);
});
