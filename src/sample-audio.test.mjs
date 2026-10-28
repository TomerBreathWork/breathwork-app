import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SampleAudio } from './sample-audio.ts';

const recordings = { inhale: 'low.mp3', holdAfterInhale: 'high.mp3', exhale: 'mid.mp3', holdAfterExhale: 'high.mp3' };
const set = { id: 'samples', name: 'Samples', recordings, frequencies: {} };
class Param {
  value = 0; events = [];
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['ramp', value, time]); }
  setTargetAtTime(value, time) { this.value = value; this.events.push(['target', value, time]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}
class Gain {
  gain = new Param();
  connect(node) { this.connected = node; }
  disconnect() { this.disconnected = true; }
}
class Source {
  stops = []; loop = true;
  connect(node) { this.gain = node; }
  disconnect() { this.disconnected = true; }
  start(at, offset) { this.at = at; this.offset = offset; }
  stop(at) { this.stops.push(at); }
}
class Context {
  currentTime = 0; state = 'running'; sampleRate = 48000; destination = {}; sources = []; gains = []; decodes = 0;
  async resume() { this.state = 'running'; }
  createGain() { const gain = new Gain(); this.gains.push(gain); return gain; }
  createBufferSource() { const source = new Source(); this.sources.push(source); return source; }
  async decodeAudioData(bytes) { this.decodes++; return { duration: bytes[0], name: bytes.name }; }
}
if (!globalThis.AudioContext) globalThis.AudioContext = function () {};
async function setup(t, { duration = 8, fail = [], prepared = true } = {}) {
  const context = new Context(), fetched = []; let now = 0;
  t.mock.method(globalThis, 'AudioContext', function () { return context; });
  t.mock.method(performance, 'now', () => now * 1000);
  t.mock.method(globalThis, 'fetch', async url => {
    fetched.push(url); if (fail.includes(url)) throw new Error('Missing');
    return { ok: true, arrayBuffer: async () => Object.assign([duration], { name: url }) };
  });
  t.mock.timers.enable({ apis: ['setInterval'] });
  const audio = new SampleAudio(); await audio.unlock(); if (prepared) await audio.prepare(set);
  const ended = () => {
    for (const source of context.sources) if (!source.ended && context.currentTime >= Math.min(source.at + source.buffer.duration - source.offset, source.stops.at(-1) ?? Infinity)) {
      source.ended = true; source.onended?.();
    }
  };
  t.after(() => audio.stop());
  return { audio, context, fetched, advance(seconds) { now = seconds; context.currentTime = seconds; ended(); t.mock.timers.tick(25); ended(); } };
}

test('the supplied manifest maps low / high / mid / high and keeps the original recordings', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/media/manifest.json', import.meta.url)));
  assert.deepEqual(Object.values(manifest.recordings).map(path => path.split('/').at(-1)), ['low_F3_174Hz.mp3', 'high_F4_349Hz.mp3', 'mid_C4_262Hz.mp3', 'high_F4_349Hz.mp3']);
  for (const path of Object.values(manifest.recordings)) assert(readFileSync(new URL('../public/' + path, import.meta.url)).length > 100000);
  for (const file of ['inhale 4.MP3', 'hold 4.MP3', 'exhale 4.MP3']) assert(readFileSync(new URL('../public/media/audio/' + file, import.meta.url)).length);
});
test('all three samples preload/decode once, even with concurrent warmup and prepare, without a voice', async t => {
  const { audio, context, fetched } = await setup(t, { prepared: false });
  await Promise.all([audio.warmup(set), audio.prepare(set), audio.prepare(set)]);
  assert.equal(audio.recordingStatus, 'recorded'); assert.equal(context.decodes, 3);
  assert.deepEqual(fetched, ['low.mp3', 'high.mp3', 'mid.mp3']); assert.equal(context.sources.length, 0);
});
test('four exact phase starts are independent, overlap naturally and retain all eight seconds', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [.5, .5, .5, .5], 0, 2000);
  for (const time of [.3, .8, 1.3, 2]) advance(time);
  assert.deepEqual(c.sources.map(s => s.at), [0, .5, 1, 1.5]);
  assert.deepEqual(c.sources.map(s => s.buffer.name), ['low.mp3', 'high.mp3', 'mid.mp3', 'high.mp3']);
  assert.equal(c.sources[1].buffer, c.sources[3].buffer); assert.notEqual(c.sources[1], c.sources[3]);
  for (const source of c.sources) {
    assert.equal(source.offset, 0); assert.equal(source.loop, false); assert.equal(source.buffer.duration, 8);
    assert.deepEqual(source.stops, []); assert.deepEqual(source.gain.gain.events, []); assert.equal(source.gain.gain.value, 1);
  }
  audio.finish(); assert(c.sources.every(s => !s.stops.length));
  advance(9.6); assert(c.sources.every(s => s.disconnected && s.gain.disconnected));
});
test('Coherent skips both holds and queues exactly twelve alternating low/mid samples over six full cycles', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [5.5, 0, 5.5, 0], 0, 66000);
  for (let time = .25; time <= 66; time += .25) advance(time);
  assert.equal(c.sources.length, 12);
  assert.deepEqual(c.sources.map(s => s.at), Array.from({ length: 12 }, (_, i) => i * 5.5));
  assert(c.sources.every((s, index) => s.buffer.name === (index % 2 ? 'mid.mp3' : 'low.mp3') && s.stops.length === 0));
  advance(100); assert.equal(c.sources.length, 12);
});
test('repeated run calls and volume updates never retrigger a phase or alter its decay', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [1, 1, 1, 1], 0, 4000);
  for (let i = 0; i < 20; i++) { audio.run(set, [1, 1, 1, 1], 0, 4000); audio.setVolume(.2); }
  assert.equal(c.sources.length, 1); assert.deepEqual(c.sources[0].gain.gain.events, []);
  assert.equal(c.gains[0].gain.events.at(-1)[1], .2);
  advance(.8); audio.run(set, [1, 1, 1, 1], 800, 4000); assert.equal(c.sources.length, 2);
});
test('muting discards tails; unmute never replays current or skipped phases', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [.5, .5, .5, .5], 0, 2000); advance(.2); audio.setMuted(true);
  assert.equal(c.sources[0].stops.at(-1), .22);
  advance(1.2); audio.setMuted(false); assert.equal(c.sources.length, 1);
  advance(1.3); assert.equal(c.sources.length, 2); assert.equal(c.sources[1].at, 1.5); assert.equal(c.sources[1].buffer.name, 'high.mp3');
});
test('mute cancels prequeued cues; unmuting before their boundary schedules exactly one audible cue', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [.5, .5, .5, .5], 0, 2000); advance(.3);
  const future = c.sources[1]; assert.equal(future.at, .5);
  audio.setMuted(true); assert.equal(future.stops.at(-1), .3);
  advance(.4); audio.setMuted(false);
  assert.equal(c.sources.length, 3); assert.equal(c.sources[2].at, .5);
  assert(c.sources[2].stops.length === 0);
});
test('pause preserves all overlapping offsets; resume smoothly restores tails, not fresh strikes', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [.5, .5, .5, .5], 0, 2000); advance(.3); advance(.8); advance(1.2);
  audio.pause(); audio.pause(); const count = c.sources.length;
  assert.equal(count, 3); advance(10); assert.equal(c.sources.length, count);
  audio.run(set, [.5, .5, .5, .5], 1200, 2000);
  const resumed = c.sources.slice(count);
  assert.equal(resumed.length, 3);
  resumed.forEach((source, index) => {
    assert(Math.abs(source.offset - [1.2, .7, .2][index]) < 1e-9);
    assert.equal(source.buffer, c.sources[index].buffer);
    assert.deepEqual(source.gain.gain.events, [['set', 0, 10], ['ramp', 1, 10.004]]);
  });
  advance(10.1); assert.equal(c.sources.at(-1).buffer.name, 'high.mp3'); assert(Math.abs(c.sources.at(-1).at - 10.3) < 1e-9);
});
test('pause cancels a future source and resume cues its boundary once', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [5, 3, 7, 2], 0, 17000); advance(4.8);
  audio.pause(); assert.equal(c.sources[1].stops.at(-1), 4.8);
  advance(10); audio.run(set, [5, 3, 7, 2], 4800, 17000);
  assert.equal(c.sources.length, 4); assert(Math.abs(c.sources[2].offset - 4.8) < 1e-9);
  assert.equal(c.sources[3].buffer.name, 'high.mp3'); assert(Math.abs(c.sources[3].at - 10.2) < 1e-9);
});
test('muting while paused discards saved tails and resume only enables future phases', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [1, 1, 1, 1], 0, 4000); advance(.4); audio.pause();
  audio.setMuted(true); audio.setMuted(false); advance(10);
  audio.run(set, [1, 1, 1, 1], 400, 4000); assert.equal(c.sources.length, 1);
  advance(10.4); assert.equal(c.sources.length, 2); assert(Math.abs(c.sources[1].at - 10.6) < 1e-9);
});
test('stop and restart clean up voices and begin a new ledger without old timers', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [.5, 0, .5, 0], 0, 2000); advance(.3); audio.stop();
  assert(c.sources.every(s => s.stops.length === 1));
  advance(10); const count = c.sources.length; assert.equal(count, 2);
  audio.run(set, [.5, 0, .5, 0], 0, 2000); assert.equal(c.sources.length, count + 1); assert.equal(c.sources.at(-1).offset, 0);
});
test('normal completion preserves final decay; explicit Stop after completion silences it', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [.5, 0, .5, 0], 0, 1000); advance(.3); advance(1);
  audio.finish(); assert(c.sources.every(s => s.stops.length === 0));
  audio.stop(); assert(c.sources.every(s => s.stops.at(-1) === 1.02));
  advance(10); assert.equal(c.sources.length, 2);
});
test('short samples end naturally; long phases never loop, retrigger or resurrect ended samples', async t => {
  const { audio, context: c, advance } = await setup(t, { duration: 2 });
  audio.run(set, [20, 0, 20, 0], 0, 40000); advance(3); audio.pause();
  advance(10); audio.run(set, [20, 0, 20, 0], 3000, 40000);
  assert.equal(c.sources.length, 1); assert.deepEqual(c.sources[0].stops, []);
});
test('missing/corrupt recordings skip their role safely and never synthesize replacements', async t => {
  const { audio, context: c, advance } = await setup(t, { fail: ['high.mp3'] });
  assert.equal(audio.recordingStatus, 'partial'); audio.run(set, [.5, .5, .5, .5], 0, 2000);
  for (const time of [.3, .8, 1.3]) advance(time);
  assert.deepEqual(c.sources.map(s => s.buffer.name), ['low.mp3', 'mid.mp3']);
});
test('corrupt MP3 decoding fails safely without losing the other recordings', async t => {
  const { audio, context: c, advance } = await setup(t, { prepared: false });
  const decode = c.decodeAudioData.bind(c);
  t.mock.method(c, 'decodeAudioData', async bytes => {
    if (bytes.name === 'high.mp3') throw new Error('Invalid MP3');
    return decode(bytes);
  });
  await audio.prepare(set); assert.equal(audio.recordingStatus, 'partial');
  audio.run(set, [.5, .5, .5, .5], 0, 2000);
  for (const time of [.3, .8, 1.3]) advance(time);
  assert.deepEqual(c.sources.map(s => s.buffer.name), ['low.mp3', 'mid.mp3']);
});
test('invalid/zero rhythms and unavailable audio never start an invalid scheduler', async t => {
  const { audio, context: c } = await setup(t);
  audio.run(set, [0, 0, 0, 0], 0, 1000); assert.equal(c.sources.length, 0);
  t.mock.method(globalThis, 'AudioContext', function () { throw new Error('Unsupported'); });
  const unsupported = new SampleAudio(); await unsupported.warmup(set); await unsupported.unlock();
  assert.equal(unsupported.recordingStatus, 'unavailable'); unsupported.run(set, [1, 1, 1, 1], 0, 4000); unsupported.stop();
});
test('a main-thread stall does not replay missed phase attacks', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [1, 1, 1, 1], 0, 4000); advance(2.8);
  assert.equal(c.sources.length, 2); assert.equal(c.sources[1].buffer.name, 'high.mp3'); assert.equal(c.sources[1].at, 3);
});

test('an interrupted AudioContext never consumes a future cue before it can actually play', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [1, 1, 1, 1], 0, 4000);
  c.state = 'suspended'; advance(.8); assert.equal(c.sources.length, 1);
  c.state = 'running'; advance(.85); assert.equal(c.sources.length, 2);
  assert.equal(c.sources[1].at, 1); assert.equal(c.sources[1].buffer.name, 'high.mp3');
});

test('a zero-duration final hold is skipped even when it shares the first hold sample', async t => {
  const { audio, context: c, advance } = await setup(t);
  audio.run(set, [1, .5, 1, 0], 0, 2500);
  for (const time of [.8, 1.3, 2.5]) advance(time);
  assert.deepEqual(c.sources.map(source => source.buffer.name), ['low.mp3', 'high.mp3', 'mid.mp3']);
  audio.finish(); advance(12); assert.equal(c.sources.length, 3);
});
