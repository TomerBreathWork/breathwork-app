import { test } from "node:test";
import assert from "node:assert/strict";
import {
  launchDefaults,
  saveUpdateConfiguration,
  consumeUpdateConfiguration,
  updateHandoffKey,
} from "./launch-configuration.ts";
import { finishAt } from "./engine.ts";
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
};
const custom = {
  preset: "custom",
  rhythm: [6.5, 1.5, 8, 0.5],
  minutes: 7,
  customRhythm: [6.5, 1.5, 8, 0.5],
};
test("launch defaults give 17 whole cycles and 187 seconds, excluding preparation", () => {
  assert.deepEqual(launchDefaults, {
    preset: "coherentBreathing",
    rhythm: [5.5, 0, 5.5, 0],
    minutes: 3,
  });
  assert.equal(finishAt(launchDefaults.minutes, launchDefaults.rhythm), 187000);
});
test("automatic update handoff preserves custom configuration exactly once", () => {
  const storage = memory();
  saveUpdateConfiguration(storage, custom, 1000);
  assert.deepEqual(consumeUpdateConfiguration(storage, true, 1001), custom);
  assert.equal(consumeUpdateConfiguration(storage, true, 1002), undefined);
});
test("new launches, expired, malformed and invalid handoffs cannot override defaults", () => {
  for (const [reload, now] of [
    [false, 1001],
    [true, 61001],
    [true, 999],
  ]) {
    const storage = memory();
    saveUpdateConfiguration(storage, custom, 1000);
    assert.equal(consumeUpdateConfiguration(storage, reload, now), undefined);
    assert.equal(storage.getItem(updateHandoffKey), null);
  }
  for (const raw of [
    "null",
    "{",
    "{}",
    JSON.stringify({
      at: 1000,
      configuration: { ...custom, rhythm: [0, 0, 0, 0] },
    }),
    JSON.stringify({ at: 1000, configuration: { ...custom, minutes: NaN } }),
  ]) {
    const storage = memory();
    storage.setItem(updateHandoffKey, raw);
    assert.equal(consumeUpdateConfiguration(storage, true, 1001), undefined);
  }
});
