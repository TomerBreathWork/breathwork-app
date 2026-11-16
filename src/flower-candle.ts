import type { Rhythm } from './engine.ts';

export const flowerCandle = {
  inhale: 2,
  minutes: 1,
};
export function flowerCandleRhythm(inhale: number): Rhythm {
  const safe = Number.isFinite(inhale) ? Math.max(1, Math.min(6, Math.round(inhale))) : 2;
  return [safe, 0, safe * 2, 0];
}
/** Visual state uses only engine-owned progress and the actual phase duration. */
export function candleAt(progress: number, duration: number) {
  const p = Math.max(0, Math.min(1, progress));
  const seconds = Number.isFinite(duration) && duration > 0 ? duration : 4;
  const elapsed = p * seconds;
  const extinguishAt = Math.max(0, seconds - 1);
  const smooth = (value: number) => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  };
  // A brief handoff ends with one full second remaining, at every allowed rhythm.
  const flame = 1 - smooth((elapsed - (extinguishAt - .18)) / .18);
  const smokeProgress = Math.max(0, Math.min(1, elapsed - extinguishAt));
  return {
    flame,
    bendProgress: Math.min(1, elapsed / Math.max(.18, extinguishAt)),
    smoke: smooth((elapsed - (extinguishAt - .08)) / .16) * (.48 - smokeProgress * .10),
    smokeDrift: smokeProgress,
  };
}
