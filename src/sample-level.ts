import { cycleMilliseconds, phaseMilliseconds, validRhythm, type Rhythm } from "./engine.ts";

// Target an upper bound of -0.92 dBFS, with no waveform limiting/compression.
export const SAMPLE_OUTPUT_PEAK = 0.90;
// The scheduler accepts cues up to 250 ms late after a stall. Include that and
// an audio rendering quantum so calibration also protects delayed cue overlap.
export const CUE_DELAY_MARGIN_MS = 260;

/** Millisecond peak bounds, including every channel and frame. A sliding maximum
 * allows each cue to arrive late without depending on waveform cancellation. */
export function samplePeakEnvelope(buffer: Pick<AudioBuffer, "length" | "sampleRate" | "numberOfChannels" | "getChannelData">): Float64Array {
  const bins = Math.ceil(buffer.length * 1000 / buffer.sampleRate);
  const peaks = new Float64Array(bins + CUE_DELAY_MARGIN_MS);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let frame = 0; frame < data.length; frame++) {
      const bin = Math.floor(frame * 1000 / buffer.sampleRate);
      const value = Math.abs(data[frame]);
      peaks[bin] = Math.max(peaks[bin], Number.isFinite(value) ? value : Infinity);
    }
  }
  // Fractional audio-frame starts/resampling can straddle a millisecond edge.
  for (let bin = 0; bin + 1 < peaks.length; bin++)
    peaks[bin] = Math.max(peaks[bin], peaks[bin + 1]);
  const envelope = new Float64Array(peaks.length);
  const queue = new Int32Array(peaks.length);
  let head = 0, tail = 0;
  for (let bin = 0; bin < peaks.length; bin++) {
    while (tail > head && peaks[queue[tail - 1]] <= peaks[bin]) tail--;
    queue[tail++] = bin;
    while (queue[head] < bin - CUE_DELAY_MARGIN_MS) head++;
    envelope[bin] = peaks[queue[head]];
  }
  return envelope;
}

/** One fixed level for the entire rhythm, including steady-state overlaps and
 * final tails. Folding envelopes into one cycle bounds any number of cycles;
 * it is independent of session length and never ducks a voice at a phase edge. */
export function calibratedSampleGain(envelopes: ArrayLike<number>[], rhythm: Rhythm): number {
  if (!validRhythm(rhythm)) return 0;
  const cycle = cycleMilliseconds(rhythm);
  const mix = new Float64Array(cycle);
  let start = 0;
  for (let phase = 0; phase < 4; phase++) {
    const duration = phaseMilliseconds(rhythm[phase]);
    const envelope = envelopes[phase];
    if (duration && envelope)
      for (let age = 0; age < envelope.length; age++)
        mix[(start + age) % cycle] += envelope[age];
    start += duration;
  }
  let peak = 0;
  for (const value of mix) peak = Math.max(peak, value);
  return peak > 0 ? SAMPLE_OUTPUT_PEAK / peak : 1;
}
