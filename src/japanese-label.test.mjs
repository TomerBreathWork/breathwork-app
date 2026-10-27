import { test } from "node:test";
import assert from "node:assert/strict";
import { japaneseLabelUnits } from "./japanese-label.ts";
test("Japanese labels retain exact text and whole meaningful units without affecting other languages", () => {
  for (const label of ["コヒーレント呼吸", "呼吸エクササイズ", "集中とバランス", "お問い合わせ", "ゆっくり息を吐き切る", "長く吐く呼吸 (1:2)"]) {
    const units = japaneseLabelUnits(label);
    assert.equal(units.join(""), label);
    assert(units.every(unit => unit.length > 0));
    assert(!units.some(unit => /^[、。）」』！？]$/u.test(unit)));
  }
  assert(japaneseLabelUnits("コヒーレント呼吸").includes("コヒーレント"));
  assert.deepEqual(japaneseLabelUnits("お問い合わせ"), ["お問い合わせ"]);
  assert.equal(japaneseLabelUnits("Box Breathing"), undefined);
  assert.equal(japaneseLabelUnits("נשימה קוהרנטית"), undefined);
});
