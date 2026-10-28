import { test } from 'node:test';
import assert from 'node:assert/strict';
import { samplePeakEnvelope, calibratedSampleGain, SAMPLE_OUTPUT_PEAK, CUE_DELAY_MARGIN_MS } from './sample-level.ts';

function buffer(channels, sampleRate = 1000) {
  return { length: channels[0].length, sampleRate, numberOfChannels: channels.length, getChannelData: i => channels[i] };
}

test('calibration sees every stereo frame and allows delayed cues without changing the waveform', () => {
  const left = new Float32Array(2000), right = new Float32Array(2000);
  right[333] = -.75; left[1501] = .5;
  const envelope = samplePeakEnvelope(buffer([left, right]));
  assert.equal(envelope[332], .75); assert.equal(envelope[333 + CUE_DELAY_MARGIN_MS], .75);
  assert.equal(envelope[334 + CUE_DELAY_MARGIN_MS], 0);
  assert.equal(envelope[1501], .5); assert.equal(envelope.length, 2000 + CUE_DELAY_MARGIN_MS);
  assert.equal(right[333], -.75);
});
test('one fixed gain targets 90 percent of a non-overlapping cue peak', () => {
  const envelope = samplePeakEnvelope(buffer([new Float32Array(500).fill(.6)]));
  const gain = calibratedSampleGain([envelope, envelope, envelope, envelope], [5.5, 0, 5.5, 0]);
  assert(Math.abs(gain * envelope[0] - SAMPLE_OUTPUT_PEAK) < 1e-12);
  assert(gain > 1); // no legacy 0.35 / 0.53125 / 0.307 attenuation
});
test('periodic bounds include all overlapping cycles and tails, even with skipped holds', () => {
  const p = new Float64Array(8000).fill(.5);
  const rapid = calibratedSampleGain([p, p, p, p], [.5, .5, .5, .5]);
  const skipped = calibratedSampleGain([p, new Float64Array(8000).fill(100), p, p], [.5, 0, .5, 0]);
  assert.equal(rapid, SAMPLE_OUTPUT_PEAK / 8);
  assert.equal(skipped, rapid);
  assert.equal(calibratedSampleGain([p, p, p, p], [40, 120, 40, 120]), SAMPLE_OUTPUT_PEAK / .5);
});
test('invalid rhythms, silent data and unavailable recordings yield finite safe levels', () => {
  assert.equal(calibratedSampleGain([], [0, 0, 0, 0]), 0);
  assert.equal(calibratedSampleGain([], [5.5, 0, 5.5, 0]), 1);
  const bad = samplePeakEnvelope(buffer([new Float32Array([NaN, Infinity])]));
  assert.equal(calibratedSampleGain([bad], [1, 0, 1, 0]), 0);
});
test('fractional-frame stereo profiles conservatively bound every original sample', () => {
  for (const rate of [24000, 44100, 48000]) {
    const data = Float32Array.from({ length: rate }, (_, i) => Math.sin(i * .37) * Math.exp(-i / rate));
    const envelope = samplePeakEnvelope(buffer([data], rate));
    for (let frame = 0; frame < data.length; frame++)
      assert(Math.abs(data[frame]) <= envelope[Math.floor(frame * 1000 / rate)]);
  }
});
test('calibrated gain bounds rapid mixes with independently delayed phase cues and final tails', () => {
  const data = Float32Array.from({ length: 1500 }, (_, i) => Math.sin(i * .29) * Math.exp(-i / 400));
  const p = samplePeakEnvelope(buffer([data]));
  for (const rhythm of [[.5, .05, .6, .001], [.5, 0, .5, 0], [1, .5, 1, .5]]) {
    const gain = calibratedSampleGain([p, p, p, p], rhythm);
    const out = new Float64Array(12000);
    let at = 0, cue = 0;
    while (at < 9000) for (const seconds of rhythm) {
      if (seconds) {
        const delay = cue++ * 83 % (CUE_DELAY_MARGIN_MS + 1);
        for (let i = 0; i < data.length; i++) out[at + delay + i] += data[i] * gain;
      }
      at += Math.round(seconds * 1000);
    }
    assert(Math.max(...out.map(Math.abs)) <= SAMPLE_OUTPUT_PEAK + 1e-7);
  }
});
