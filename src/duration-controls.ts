import { validRhythm, type Rhythm } from "./engine.ts";

export const phaseLimits = (index: number) =>
  index === 0 || index === 2 ? { min: 0.5, max: 40 } : { min: 0, max: 120 };
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export function clampPhaseDuration(index: number, value: number): number {
  const { min, max } = phaseLimits(index);
  return clamp(value, min, max);
}
export function validConfiguredRhythm(rhythm: Rhythm): boolean {
  return (
    validRhythm(rhythm) &&
    rhythm.every((value, index) => {
      const { min, max } = phaseLimits(index);
      return value >= min && value <= max;
    })
  );
}
// Preserve legacy rhythms and Custom memory while applying the new bounds.
export function migrateRhythm(value: unknown): Rhythm | undefined {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every((n) => Number.isFinite(n) && n >= 0) ||
    !value.some((n) => n > 0)
  )
    return;
  return value.map((n, i) => clampPhaseDuration(i, n)) as Rhythm;
}
const holdBands = [
  { from: 0, to: 30, start: 0, end: 70, step: 0.5 },
  { from: 30, to: 60, start: 70, end: 80, step: 2 },
  { from: 60, to: 90, start: 80, end: 90, step: 5 },
  { from: 90, to: 120, start: 90, end: 100, step: 10 },
];
/** Position is a percentage; quantization happens only during slider interaction. */
export function sliderPositionToHoldDuration(position: number): number {
  const p = clamp(Number.isFinite(position) ? position : 0, 0, 100);
  const band = holdBands.find((b) => p <= b.end)!;
  const value =
    band.from +
    ((p - band.start) / (band.end - band.start)) * (band.to - band.from);
  return clamp(
    band.from + Math.round((value - band.from) / band.step) * band.step,
    band.from,
    band.to,
  );
}
/** Continuous inverse: exact manual values keep their real position and duration. */
export function holdDurationToSliderPosition(duration: number): number {
  const value = clamp(Number.isFinite(duration) ? duration : 0, 0, 120);
  const band = holdBands.find((b) => value <= b.to)!;
  return (
    band.start +
    ((value - band.from) / (band.to - band.from)) * (band.end - band.start)
  );
}
const holdStops = [
  ...new Set(
    holdBands.flatMap((b) =>
      Array.from(
        { length: Math.round((b.to - b.from) / b.step) + 1 },
        (_, i) => b.from + i * b.step,
      ),
    ),
  ),
];
export function nextHoldDuration(value: number, direction: 1 | -1): number {
  return direction === 1
    ? (holdStops.find((stop) => stop > value + 1e-9) ?? 120)
    : ([...holdStops].reverse().find((stop) => stop < value - 1e-9) ?? 0);
}
