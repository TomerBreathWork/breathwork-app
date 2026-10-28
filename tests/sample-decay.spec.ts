import { SAMPLE_OUTPUT_PEAK } from '../src/sample-level';
import { test, expect } from '@playwright/test';
import { build } from 'vite';
import { resolve } from 'node:path';

let audioCode: string;
test.beforeAll(async () => {
  const result = await build({ configFile: false, logLevel: 'silent', build: { write: false, lib: { entry: resolve('tests/audio-harness.ts'), name: 'AudioTest', formats: ['iife'] } } });
  const chunk = (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('Missing audio harness');
  audioCode = chunk.code;
});

test('each actual MP3 retains its original strike and quiet 6–7s tail through all eight seconds', async ({ page }) => {
  await page.goto('./'); await expect(page.locator('.start-button')).toBeEnabled();
  await page.addScriptTag({ content: audioCode });
  const results = await page.evaluate(async () => {
    const Native = window.AudioContext, rate = 24000, results = [];
    const files = ['low_F3_174Hz.mp3', 'high_F4_349Hz.mp3', 'mid_C4_262Hz.mp3'];
    const rms = (data: Float32Array, from: number, until: number) => {
      let energy = 0; for (let i = Math.round(from * rate); i < Math.round(until * rate); i++) energy += data[i] ** 2;
      return Math.sqrt(energy / Math.round((until - from) * rate));
    };
    for (const file of files) {
      const context = new OfflineAudioContext(2, rate * 8.2, rate);
      let original!: AudioBuffer;
      const create = context.createBufferSource.bind(context);
      context.createBufferSource = () => {
        const source = create(), start = source.start.bind(source);
        source.start = (...args) => { original = source.buffer!; start(...args); }; return source;
      };
      const proxy = new Proxy(context, { get(target, key) { if (key === 'state') return 'running'; if (key === 'resume') return async () => {}; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
      window.AudioContext = function () { return proxy; } as any;
      const engine = new (window as any).AudioTest.SampleAudio();
      engine.setVolume(1); await engine.unlock();
      const url = new URL(`media/audio/bowls/${file}`, location.href).href;
      await engine.prepare({ id: file, name: file, frequencies: {}, recordings: { inhale: url, holdAfterInhale: url, exhale: url, holdAfterExhale: url } });
      engine.preview({ recordings: { inhale: url } });
      const output = await context.startRendering();
      const raw = original.getChannelData(0), played = output.getChannelData(0);
      const initial = rms(played, 0, .5), gain = initial / rms(raw, 0, .5);
      let difference = 0, peak = 0, afterEnd = 0;
      for (let ch = 0; ch < 2; ch++) {
        const source = original.getChannelData(ch), data = output.getChannelData(ch);
        for (let i = 0; i < source.length; i++) { difference = Math.max(difference, Math.abs(data[i] - source[i] * gain)); peak = Math.max(peak, Math.abs(data[i])); }
        for (let i = source.length; i < data.length; i++) afterEnd = Math.max(afterEnd, Math.abs(data[i]));
      }
      results.push({ file, seconds: original.duration, gain, difference, peak, afterEnd, initial, at6: rms(played, 6, 6.5), at6_5: rms(played, 6.5, 7), at7_5: rms(played, 7.5, 8) });
      engine.stop();
    }
    window.AudioContext = Native; return results;
  });
  for (const result of results) {
    expect(result.seconds).toBeCloseTo(8, 3);
    expect(result.peak).toBeCloseTo(SAMPLE_OUTPUT_PEAK, 5);
    // Only constant headroom/master gain is permitted: no added attack, phase
    // envelope, looping, stretching, reverb or tail cutoff changes the recording.
    expect(result.difference).toBeLessThan(1e-6);
    expect(result.at6).toBeGreaterThan(result.initial * .005);
    expect(result.at6_5).toBeGreaterThan(result.initial * .005);
    expect(result.at6_5).toBeLessThan(result.initial * .05);
    expect(result.at7_5).toBeLessThan(result.initial * .005);
    expect(result.peak).toBeLessThan(1); expect(result.afterEnd).toBe(0);
  }
});

for (const sampleRate of [24000, 44100, 48000]) test(`calibrated recorded mixes are audible and keep all tails clean, including delayed cues (${sampleRate} Hz)`, async ({ page }) => {
  await page.goto('./'); await expect(page.locator('.start-button')).toBeEnabled();
  await page.addScriptTag({ content: audioCode });
  const results = await page.evaluate(async (rate) => {
    const Native = window.AudioContext, nativeNow = performance.now.bind(performance), nativeInterval = window.setInterval;
    const volume = 1, results = [];
    const files = ['low_F3_174Hz.mp3', 'high_F4_349Hz.mp3', 'mid_C4_262Hz.mp3', 'high_F4_349Hz.mp3'];
    try {
      for (const delayed of [false, true]) for (const rhythm of [[5.5, 0, 5.5, 0], [4, 4, 4, 4], [4, 7, 8, 0], [.5, .5, .5, .5], [.5, 0, .5, 0], [.5, 0, .5, .5], [.5, .001, .5, .001], [.6, .05, .5, .001]]) {
        const cycle = rhythm.reduce((sum, seconds) => sum + seconds, 0), end = Math.ceil(16 / cycle) * cycle;
        const context = new OfflineAudioContext(2, Math.round(rate * (end + 8.5)), rate);
        const voices: { buffer: AudioBuffer; start: number }[] = [];
        const create = context.createBufferSource.bind(context);
        context.createBufferSource = () => {
          const source = create(), start = source.start.bind(source);
          source.start = (...args) => {
            // Simulate independent scheduler delays within the accepted margin.
            const at = (args[0] ?? 0) + (delayed ? [0, .1, .25][voices.length % 3] : 0);
            voices.push({ buffer: source.buffer!, start: Math.round(at * rate) }); start(at, args[1], args[2]);
          }; return source;
        };
        const proxy = new Proxy(context, { get(target, key) { if (key === 'state') return 'running'; if (key === 'resume') return async () => {}; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
        window.AudioContext = function () { return proxy; } as any;
        const engine = new (window as any).AudioTest.SampleAudio();
        engine.setVolume(volume); await engine.unlock();
        const urls = files.map(file => new URL(`media/audio/bowls/${file}`, location.href).href);
        const set = { id: 'real-mix', name: 'Mix', frequencies: {}, recordings: { inhale: urls[0], holdAfterInhale: urls[1], exhale: urls[2], holdAfterExhale: urls[3] } };
        await engine.prepare(set);
        let wall = 0, pump!: () => void;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => wall });
        window.setInterval = ((handler: () => void) => { pump = handler; return -1; }) as any;
        engine.run(set, rhythm, 0, end * 1000);
        const effectiveGain = (engine as any).mix.gain.value * volume;
        for (wall = 125; wall < end * 1000; wall += 125) pump();
        const suspended = context.suspend(end), rendering = context.startRendering();
        await suspended; engine.finish(); await context.resume();
        const output = await rendering;
        let peak = 0, difference = 0;
        for (let ch = 0; ch < 2; ch++) {
          const data = output.getChannelData(ch);
          for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
          // Compare the actual graph with the direct sum of full original MP3s.
          // The final tails must survive the session deadline, without ducking.
          for (let i = 0; i < data.length; i += 32) {
            let expected = 0;
            for (const voice of voices) { const offset = i - voice.start; if (offset >= 0 && offset < voice.buffer.length) expected += voice.buffer.getChannelData(ch)[offset] * effectiveGain; }
            difference = Math.max(difference, Math.abs(data[i] - expected));
          }
        }
        const expectedCount = Math.round(end / cycle) * rhythm.filter(seconds => seconds > 0).length;
        results.push({ rhythm, delayed, effectiveGain, peak, difference, count: voices.length, expectedCount });
        engine.stop();
      }
    } finally {
      window.AudioContext = Native; window.setInterval = nativeInterval;
      Object.defineProperty(performance, 'now', { configurable: true, value: nativeNow });
    }
    return results;
  }, sampleRate);
  await test.info().attach(`measured-mixes-${sampleRate}.json`, { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  for (const result of results) {
    expect(result.count).toBe(result.expectedCount);
    expect(result.peak).toBeGreaterThan(.1); expect(result.peak).toBeLessThan(SAMPLE_OUTPUT_PEAK + 1e-5);
    if (!result.delayed && result.rhythm[0] >= 4) expect(result.peak).toBeGreaterThan(.85);
    // At 44.1 kHz, 1 ms is a fractional audio frame; the browser quantizes those
    // starts. Whole-frame schedules still compare sample-for-sample.
    if (result.rhythm.every(seconds => Number.isInteger(seconds * sampleRate)))
      expect(result.difference).toBeLessThan(1e-6);
  }
});
