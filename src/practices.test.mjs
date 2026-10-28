import { test } from "node:test";
import assert from "node:assert/strict";
import {
  practices,
  getPractice,
  adjustPractice,
  isAdjusted,
  categories,
} from "./practices.ts";
import { validConfiguredRhythm } from "./duration-controls.ts";
import { finishAt } from "./engine.ts";
import { screenFromHistory } from "./navigation.ts";
import { PREPARATION_MS } from "./preparation.ts";
test("five unique practice definitions retain exact defaults and per-phase routes", () => {
  assert.deepEqual(
    practices.map((p) => p.rhythm),
    [
      [5.5, 0, 5.5, 0],
      [4, 4, 4, 4],
      [4.5, 0, 4.5, 0],
      [4, 0, 8, 0],
      [4, 7, 8, 0],
    ],
  );
  assert.equal(new Set(practices.map((p) => p.id)).size, 5);
  for (const p of practices) {
    assert(validConfiguredRhythm(p.rhythm));
    assert(p.categories.length > 0);
    assert(p.categories.every((c) => categories.includes(c)));
    assert(p.name && p.short && p.explanation && p.benefit && p.useCases);
    assert.equal(p.routes.inhale, "nose");
  }
  assert.equal(getPractice("478").routes.exhale, "mouth");
  assert.equal(getPractice("unknown"), undefined);
});
test("ratio and common-phase adjustments preserve exact half-second relationships and bounds", () => {
  for (const seconds of [0.5, 1, 3.5, 4.5, 5.5, 10]) {
    assert.deepEqual(adjustPractice(getPractice("equal"), seconds), [
      seconds,
      0,
      seconds,
      0,
    ]);
    assert.deepEqual(adjustPractice(getPractice("extended"), seconds), [
      seconds,
      0,
      seconds * 2,
      0,
    ]);
    assert.deepEqual(adjustPractice(getPractice("box"), seconds), [
      seconds,
      seconds,
      seconds,
      seconds,
    ]);
  }
  for (const value of [NaN, -1, 120, Infinity])
    assert(
      validConfiguredRhythm(adjustPractice(getPractice("extended"), value)),
    );
  assert.equal(isAdjusted(getPractice("coherent"), [5.5, 0, 5.5, 0]), false);
  assert.equal(isAdjusted(getPractice("box"), [3.5, 3.5, 3.5, 3.5]), true);
});
test("three-second preparation stays separate from the existing precise full-cycle calculation", () => {
  assert.equal(PREPARATION_MS, 3000);
  assert.equal(finishAt(3, getPractice("coherent").rhythm), 187000);
  assert.equal(
    finishAt(1, adjustPractice(getPractice("extended"), 4.5)),
    67500,
  );
  assert.equal(finishAt(3, adjustPractice(getPractice("box"), 3.5)), 182000);
});
test("history validates library/details states and never recreates an active session", () => {
  assert.deepEqual(screenFromHistory({ breathFlowView: { name: "library" } }), {
    name: "library",
  });
  assert.deepEqual(
    screenFromHistory({ breathFlowView: { name: "details", id: "extended" } }),
    { name: "details", id: "extended" },
  );
  for (const value of [
    null,
    {},
    { breathFlowView: { name: "details", id: "invalid" } },
    { breathFlow: "stale-session" },
  ])
    assert.deepEqual(screenFromHistory(value), { name: "home" });
});

test("visible categories hide Energy without deleting data; Box belongs only to Focus", async () => {
  const { visibleCategories } = await import("./practices.ts");
  assert.deepEqual(visibleCategories, ["calm", "focus"]);
  assert(categories.includes("energy"));
  assert(getPractice("equal").categories.includes("energy"));
  assert.deepEqual(getPractice("box").categories, ["focus"]);
  assert.deepEqual(getPractice("box").rhythm, [4, 4, 4, 4]);
});
