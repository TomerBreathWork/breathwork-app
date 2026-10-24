export type Rhythm = [number, number, number, number];
export const labels = ["Inhale", "Hold", "Exhale", "Hold"];
// Integer milliseconds keep fractional phases and cycle boundaries exact. Values
// finer than the UI's half-second steps remain readable for existing saved rhythms.
export const phaseMilliseconds = (seconds: number) =>
  Math.round(seconds * 1000);
export function validRhythm(r: Rhythm) {
  return (
    Array.isArray(r) &&
    r.length === 4 &&
    r.every(
      (n) =>
        Number.isFinite(n) &&
        n >= 0 &&
        n <= 120 &&
        (n === 0 || phaseMilliseconds(n) > 0),
    ) &&
    r.some((n) => n > 0)
  );
}
export function cycleMilliseconds(rhythm: Rhythm) {
  if (!validRhythm(rhythm)) throw new Error("Invalid breathing rhythm");
  return rhythm.reduce((sum, duration) => sum + phaseMilliseconds(duration), 0);
}
export function phaseAt(elapsed: number, rhythm: Rhythm) {
  const cycle = cycleMilliseconds(rhythm);
  const lap = Math.floor(elapsed / cycle);
  const offset = elapsed - lap * cycle;
  let start = 0;
  for (let i = 0; i < 4; i++) {
    const duration = phaseMilliseconds(rhythm[i]);
    if (duration > 0 && offset < start + duration)
      return {
        index: i,
        progress: (offset - start) / duration,
        remaining: (start + duration - offset) / 1000,
        key: `${lap}-${i}`,
      };
    start += duration;
  }
  throw new Error("Phase not found");
}
export function finishAt(minutes: number, rhythm: Rhythm) {
  const cycle = cycleMilliseconds(rhythm);
  if (!Number.isFinite(minutes) || minutes <= 0)
    throw new Error("Invalid session duration");
  const target = Math.round(minutes * 60000);
  return Math.ceil(target / cycle) * cycle;
}
