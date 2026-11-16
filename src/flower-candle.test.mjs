import test from 'node:test';
import assert from 'node:assert/strict';
import { candleAt, flowerCandleRhythm } from './flower-candle.ts';
import { phaseAt, finishAt } from './engine.ts';
for (const inhale of [1, 2, 3, 4, 5, 6]) {
  test(`Flower & Candle ${inhale}: exact 1:2 timing, no holds and full cycles`, () => {
    const rhythm = flowerCandleRhythm(inhale);
    assert.deepEqual(rhythm, [inhale, 0, inhale * 2, 0]);
    assert.equal(phaseAt(inhale * 1000 - 1, rhythm).index, 0);
    assert.equal(phaseAt(inhale * 1000, rhythm).index, 2);
    assert.equal(phaseAt(inhale * 3000 - 1, rhythm).index, 2);
    assert.equal(phaseAt(inhale * 3000, rhythm).index, 0);
    const end = finishAt(1, rhythm);
    assert.ok(end >= 60000);
    assert.equal(end % (inhale * 3000), 0);
  });
}
for (const duration of [2, 4, 6, 8, 10, 12]) {
  test(`smoke occupies the final second of a ${duration}s exhale`, () => {
    const at = remaining => candleAt(1 - remaining / duration, duration);
    assert.equal(at(1.2).flame, 1);
    assert.equal(at(1.2).smoke, 0);
    assert.ok(at(1.08).flame > 0 && at(1.08).flame < 1);
    assert.ok(at(1).flame < 1e-10);
    for (const remaining of [.95, .75, .5, .25, .01]) {
      assert.ok(at(remaining).smoke > .3);
      assert.equal(at(remaining).flame, 0);
    }
    assert.equal(at(.5).bendProgress, 1);
    assert.ok(at(.25).smokeDrift > at(.75).smokeDrift);
    assert.deepEqual(at(.5), at(.5));
  });
}
test('visual state clamps progress without a wall clock', () => {
  assert.deepEqual(candleAt(-10,4), candleAt(0,4));
  assert.deepEqual(candleAt(10,4), candleAt(1,4));
});
