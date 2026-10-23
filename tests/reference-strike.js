/*!
MIT License

Copyright (c) 2026 Olivier Giulieri

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
// Test-only extraction from upstream js/bowls.js, not the production adapter.
// Wrapper injects context/random and exact tuning; struck-voice code is otherwise retained.
export function referenceStrike(AC,destination,freq,random){
const Math=Object.create(globalThis.Math);Math.random=random;
const PARTIALS = [
  { ratio: 1, amp: 1, beat: 0.55, tau: 3.4 },
  { ratio: 2.71, amp: 0.5, beat: 1.3, tau: 1.9 },
  { ratio: 5.15, amp: 0.26, beat: 2.4, tau: 1.1 },
  { ratio: 8.3, amp: 0.11, beat: 3.7, tau: 0.6 },
];

const impulse = (ctx, seconds = 3.6, decay = 2.6) => {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += 0.35 * (Math.random() * 2 - 1 - lp); // soften the highs
      data[i] = lp * Math.pow(1 - t, decay) * 1.6;
    }
  }
  return buf;
};

const bus=AC.createGain(),dryGain=AC.createGain(),wetGain=AC.createGain(),conv=AC.createConvolver(),master=AC.createGain(),comp=AC.createDynamicsCompressor();
conv.buffer=impulse(AC);comp.threshold.value=-16;comp.ratio.value=6;
dryGain.gain.value=1-.45*.35;wetGain.gain.value=.35*1.1;master.gain.value=.7**1.6;
bus.connect(dryGain).connect(master);bus.connect(conv).connect(wetGain).connect(master);master.connect(comp).connect(destination);
const clink = (t0, strength) => {
  const len = Math.floor(AC.sampleRate * 0.03);
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const bp = AC.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 0.8;
  const g = AC.createGain();
  g.gain.value = 0.10 * strength;
  src.connect(bp).connect(g).connect(bus);
  src.start(t0);
};

// One bowl voice. `sing` voices swell slowly and hold until released; struck
// voices start loud and ring out on their own.
const makeVoice = (freq, { sing = false, strength = 1 } = {}) => {
  const t0 = AC.currentTime;
  const out = AC.createGain();
  out.gain.value = 0;
  const wob = AC.createGain();
  wob.gain.value = sing ? 0.82 : 1;
  out.connect(wob).connect(bus);
  const nodes = [];
  let lfo = null;
  if (sing) {
    lfo = AC.createOscillator();
    lfo.frequency.value = 0.28 + Math.random() * 0.2;
    const lg = AC.createGain();
    lg.gain.value = 0.16;
    lfo.connect(lg).connect(wob.gain);
    lfo.start(t0);
    nodes.push(lfo);
  }
  const drift = 1; // Exact-frequency requirement; the production adapter does the same.
  let maxTau = 0;
  PARTIALS.forEach((p, i) => {
    const f = freq * p.ratio * drift;
    const pg = AC.createGain();
    pg.gain.value = p.amp * (sing && i > 1 ? 0.5 : 1);
    const env = AC.createGain();
    if (sing) {
      env.gain.value = 1;
    } else {
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(1, t0 + 0.004);
      env.gain.setTargetAtTime(0, t0 + 0.004, p.tau);
    }
    maxTau = Math.max(maxTau, p.tau);
    for (const d of [0, p.beat * (0.8 + Math.random() * 0.4)]) {
      const o = AC.createOscillator();
      o.type = "sine";
      o.frequency.value = f + d;
      o.connect(pg);
      o.start(t0);
      nodes.push(o);
    }
    pg.connect(env).connect(out);
  });
  const peak = 0.2 * strength;
  if (sing) {
    out.gain.setTargetAtTime(peak * 1.15, t0, 0.9);
  } else {
    out.gain.setValueAtTime(peak, t0);
    clink(t0, strength);
    const stopAt = t0 + maxTau * 7 + 0.5;
    nodes.forEach((n) => n.stop(stopAt));
  }
  return {
    t0,
    tau: PARTIALS[0].tau,
    release() {
      const t = AC.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(0, t, 1.3);
      nodes.forEach((n) => n.stop(t + 9));
    },
  };
};


return makeVoice(freq);
}
