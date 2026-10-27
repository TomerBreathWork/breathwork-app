import { phaseMilliseconds, validRhythm, type Rhythm } from "./engine.ts";
/** CSS keyframes share the engine's exact millisecond phase boundaries.
 * Preview only: never starts a session timer or schedules sound. */
export function patternPreview(rhythm: Rhythm) {
  if (!validRhythm(rhythm)) return undefined;
  const duration = rhythm.reduce((sum, value) => sum + phaseMilliseconds(value), 0);
  let elapsed = 0;
  const frames = [{ percent: 0, fill: 0 }];
  rhythm.forEach((value, index) => {
    const phase = phaseMilliseconds(value);
    if (!phase) return;
    elapsed += phase;
    frames.push({ percent: (elapsed / duration) * 100, fill: index < 2 ? 1 : 0 });
  });
  return { duration, frames };
}
