import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSavedHomeSelection } from './home-selection.ts';

test('first visits and automatic default saves do not imply a practice choice', () => {
  for (const saved of [undefined, null, {}, { sound: 'silent' },
    { rhythm: [5.5, 0, 5.5, 0], preset: 'coherentBreathing', homePracticeSelected: false },
    { rhythm: [0, 0, 0, 0], homePracticeSelected: true }])
    assert.equal(hasSavedHomeSelection(saved), false);
});
test('explicit and legacy choices restore without losing fractional or library settings', () => {
  for (const saved of [
    { rhythm: [5.5, 0, 5.5, 0], preset: 'coherentBreathing', homePracticeSelected: true },
    { rhythm: [6, 6, 6, 6], preset: 'boxBreathing' },
    { rhythm: [4, 7, 8, 0], preset: 'eveningUnwind' },
    { rhythm: [6.5, 0, 8.5, 1], preset: 'custom' },
    { rhythm: [4.5, 0, 9, 0], preset: 'custom', practiceId: 'extended' },
  ]) assert.equal(hasSavedHomeSelection(saved), true);
});

test('safe update handoff carries the explicit-choice marker without depending on local storage', async () => {
  const { saveUpdateConfiguration, consumeUpdateConfiguration } = await import('./launch-configuration.ts');
  for (const selected of [false, true]) {
    const data = new Map();
    const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
    saveUpdateConfiguration(storage, { preset: 'coherentBreathing', practiceId: 'coherent', rhythm: [5.5,0,5.5,0], minutes: 3, homePracticeSelected: selected }, 1000);
    assert.equal(consumeUpdateConfiguration(storage, true, 1001).homePracticeSelected, selected);
  }
});
