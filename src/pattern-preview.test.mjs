import { test } from "node:test";
import assert from "node:assert/strict";
import { patternPreview } from "./pattern-preview.ts";
test("preview uses fractional engine boundaries and holds remain stationary", () => {
  const coherent = patternPreview([5.5, 0, 5.5, 0]);
  assert.equal(coherent.duration, 11000);
  assert.deepEqual(coherent.frames, [{percent:0,fill:0},{percent:50,fill:1},{percent:100,fill:0}]);
  assert.deepEqual(patternPreview([4, 4, 4, 4]).frames, [{percent:0,fill:0},{percent:25,fill:1},{percent:50,fill:1},{percent:75,fill:0},{percent:100,fill:0}]);
  assert.equal(patternPreview([0.5, 0, 1, 0]).duration, 1500);
  assert.equal(patternPreview([0, 0, 0, 0]), undefined);
  assert.equal(patternPreview([NaN, 0, 4, 0]), undefined);
});
