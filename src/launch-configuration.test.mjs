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
  practiceId: "custom",
  rhythm: [6.5, 1.5, 8, 0.5],
  minutes: 7,
  customRhythm: [6.5, 1.5, 8, 0.5],
};
test("launch defaults give 17 whole cycles and 187 seconds, excluding preparation", () => {
  assert.deepEqual(launchDefaults, {
    preset: "coherentBreathing",
    rhythm: [5.5, 0, 5.5, 0],
    minutes: 3,
    practiceId: "coherent",
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

test("saved explicit presets, fractional Custom and legacy choices migrate without losing preferences", async () => {
  const { restoreSavedConfiguration } = await import("./launch-configuration.ts");
  for (const [preset, rhythm, expected] of [
    ["coherentBreathing", [5.5, 0, 5.5, 0], "coherentBreathing"],
    ["boxBreathing", [4, 4, 4, 4], "boxBreathing"],
    ["eveningUnwind", [4, 7, 8, 0], "eveningUnwind"],
    ["custom", [6.5, 1.5, 8, 0.5], "custom"],
    ["retired", [3.5, 0, 6, 1], "custom"],
  ]) {
    const result = restoreSavedConfiguration({ preset, rhythm, minutes: 7 });
    assert.equal(result.preset, expected);
    assert.deepEqual(result.rhythm, rhythm);
    assert.equal(result.minutes, 7);
  }
  const result = restoreSavedConfiguration({ preset: "custom", rhythm: [120, 4.5, 100, 0], customRhythm: [80, 31.5, 6, 0], minutes: 7 });
  assert.deepEqual(result.rhythm, [40, 4.5, 40, 0]);
  assert.deepEqual(result.customRhythm, [40, 31.5, 6, 0]);
  assert.deepEqual(restoreSavedConfiguration({ volume: 0.2 }), {});
  assert.deepEqual(restoreSavedConfiguration({ rhythm: [0, 0, 0, 0], minutes: -1 }), {});
  assert.deepEqual(restoreSavedConfiguration(null), {});
  const library = restoreSavedConfiguration({ practiceId: "extended", preset: "custom", rhythm: [4.5, 0, 9, 0], minutes: 5 });
  assert.equal(library.practiceId, "extended");
});
