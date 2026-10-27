import { test, expect } from '@playwright/test';
import { build } from 'vite';
import { resolve } from 'node:path';
import { observeSamples } from './sample-observer';
import { showRetainedAdvanced } from './retained-advanced';

let audioCode: string;
test.beforeAll(async () => {
  const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, lib: { entry: resolve('tests/audio-harness.ts'), name: 'AudioTest', formats: ['iife'] } } });
  const chunk = (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('Missing audio harness');
  audioCode = chunk.code;
});

test('real MP3 samples preload once and play low/high/low/mid independently without phase cutoffs', async ({ page }) => {
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.addInitScript(observeSamples);
  await page.addInitScript(() => localStorage.setItem('still-settings', JSON.stringify({ preset: 'custom', practiceId: 'custom', rhythm: [1, 1, 1, 1], minutes: 1, sound: 'bowls', volume: .25, background: 'photo-3' })));
  await page.goto('./');
  await expect(page.locator('.start-button')).toBeEnabled();
  const decoded = await page.evaluate(() => (window as any).sampleAudio.decoded);
  expect(decoded).toHaveLength(3);
  expect(decoded.map((sample: any) => sample.url.split('/').at(-1)).sort()).toEqual(['high_F4_349Hz.mp3', 'low_F3_174Hz.mp3', 'mid_C4_262Hz.mp3']);
  for (const sample of decoded) { expect(sample.duration).toBeCloseTo(8, 2); expect(sample.channels).toBe(2); expect(sample.url).toContain('/breathwork-app/media/audio/bowls/'); }
  expect(await page.evaluate(() => (window as any).sampleAudio.starts)).toEqual([]);
  await page.locator('.start-button').click(); await page.clock.runFor(2990);
  expect(await page.evaluate(() => (window as any).sampleAudio.starts)).toEqual([]);
  await page.clock.runFor(30);
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase', '0');
  for (let index = 0; index < 3; index++) await page.clock.runFor(1000);
  const starts = await page.evaluate(() => (window as any).sampleAudio.starts);
  expect(starts.map((event: any) => event.url.split('/').at(-1))).toEqual(['low_F3_174Hz.mp3', 'high_F4_349Hz.mp3', 'low_F3_174Hz.mp3', 'mid_C4_262Hz.mp3']);
  for (const event of starts) { expect(event.offset).toBe(0); expect(event.stops).toEqual([]); expect(event.duration).toBeCloseTo(8, 2); }
  // All later phase deadlines use the same precise audio origin.
  expect(starts[2].at - starts[1].at).toBeCloseTo(1, 6);
  expect(starts[3].at - starts[2].at).toBeCloseTo(1, 6);
  expect(await page.evaluate(() => (window as any).sampleAudio.oscillators)).toBe(0);
  await expect(page.getByRole('button', { name: 'Advanced Options', exact: true })).toHaveCount(0);
  // The retained preferences can rerender the app without retriggering audio.
  await showRetainedAdvanced(page); await page.getByRole('button', { name: 'Advanced Options', exact: true }).click();
  await page.getByRole('slider', { name: 'Volume', exact: true }).fill('0.15');
  await page.getByRole('combobox', { name: 'Background', exact: true }).selectOption('photo-2');
  expect(await page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(4);
  expect(await page.evaluate(() => (window as any).sampleAudio.decoded.length)).toBe(3);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
});

test('mute/unmute changes future cues only; pause/resume retains an already-playing sample offset', async ({ page }) => {
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.addInitScript(observeSamples);
  await page.goto('./'); await page.locator('.start-button').click();
  await page.clock.runFor(3020);
  await expect.poll(() => page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(1);
  // Let the real AudioContext render, independently of the controlled UI clock.
  await new Promise(resolve => setTimeout(resolve, 120));
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const time = await page.locator('.remaining-value').innerText();
  await page.clock.runFor(4000); await expect(page.locator('.remaining-value')).toHaveText(time);
  expect(await page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(2);
  const resumed = await page.evaluate(() => (window as any).sampleAudio.starts[1]);
  expect(resumed.offset).toBeGreaterThan(.05); expect(resumed.url).toContain('low_F3_174Hz.mp3');
  const mute = page.locator('.practice-mute');
  await mute.click(); await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(2000); await mute.click();
  expect(await page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(2);
  await page.clock.runFor(3500);
  expect(await page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(3);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.locator('.phase-count')).toHaveText('3');
  await page.clock.runFor(2990); expect(await page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(3);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.clock.runFor(12000); expect(await page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(3);
});

function constantRecording() {
  const rate = 24000, length = rate * 2, wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) wav.writeInt16LE(16000, 44 + i * 2);
  return wav;
}
test('real Web Audio rendering retains overlap and final tails through normal completion', async ({ page }) => {
  await page.route('**/media/audio/polyphonic-*.wav', route => route.fulfill({ contentType: 'audio/wav', body: constantRecording() }));
  await page.goto('./'); await expect(page.locator('.start-button')).toBeEnabled();
  await page.addScriptTag({ content: audioCode });
  const output = await page.evaluate(async () => {
    const Native = window.AudioContext, rate = 24000;
    const context = new OfflineAudioContext(1, rate * 2.4, rate);
    const proxy = new Proxy(context, { get(target, key) { if (key === 'state') return 'running'; if (key === 'resume') return async () => {}; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
    window.AudioContext = function () { return proxy; } as any;
    const engine = new (window as any).AudioTest.SampleAudio();
    engine.setVolume(.25); await engine.unlock();
    const url = (name: string) => new URL(`media/audio/polyphonic-${name}.wav`, location.href).href;
    const set = { id: 'overlap', name: 'Test', frequencies: {}, recordings: { inhale: url('low'), holdAfterInhale: url('high'), exhale: url('low'), holdAfterExhale: url('mid') } };
    await engine.prepare(set);
    engine.run(set, [.05, .05, .05, .05], 0, 200);
    const suspend = context.suspend(.25);
    const rendering = context.startRendering();
    await suspend; engine.finish(); await context.resume();
    const data = (await rendering).getChannelData(0);
    engine.stop(); window.AudioContext = Native;
    return [.025, .075, .125, .175, .225, 1.9, 2.025, 2.075, 2.125, 2.2].map(time => data[Math.round(time * rate)]);
  });
  // Chromium normalizes positive PCM16 samples against 32767.
  const one = 16000 / 32767 * .25;
  // No dipping at phase boundaries, no fade at the 0.2s session boundary.
  [1, 2, 3, 4, 4, 4, 3, 2, 1, 0].forEach((voices, index) => expect(output[index]).toBeCloseTo(one * voices, 5));
});

test('a delayed unmute unlock cannot start an old rhythm after Stop and a new Start', async ({ page }) => {
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.addInitScript(observeSamples);
  await page.addInitScript(() => {
    (window as any).holdUnlocks = false;
    (window as any).pendingUnlocks = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      async resume() {
        await super.resume();
        if ((window as any).holdUnlocks)
          await new Promise<void>(resolve => (window as any).pendingUnlocks.push(resolve));
      }
    };
  });
  await page.goto('./'); await page.locator('.start-button').click();
  await page.clock.runFor(3020);
  await expect.poll(() => page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(1);
  await page.locator('.practice-mute').click();
  await page.evaluate(() => (window as any).holdUnlocks = true);
  await page.locator('.practice-mute').click();
  await expect.poll(() => page.evaluate(() => (window as any).pendingUnlocks.length)).toBe(1);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.locator('[data-home-choice="box"]').click();
  await page.locator('.start-button').click();
  await expect.poll(() => page.evaluate(() => (window as any).pendingUnlocks.length)).toBe(2);
  await page.clock.runFor(3020);
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase', '0');
  await page.evaluate(() => (window as any).pendingUnlocks[0]());
  expect(await page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(1);
  await page.evaluate(() => { (window as any).holdUnlocks = false; (window as any).pendingUnlocks[1](); });
  await expect.poll(() => page.evaluate(() => (window as any).sampleAudio.starts.length)).toBe(2);
  await page.clock.runFor(4100);
  expect(await page.evaluate(() => (window as any).sampleAudio.starts.at(-1).url)).toContain('high_F4_349Hz.mp3');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
});
