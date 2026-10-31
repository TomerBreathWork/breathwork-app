import { validRhythm, type Rhythm } from "./engine.ts";
import { practices } from "./practices.ts";

// IDs stay stable across the renamed buttons, preserving saved configurations.
export type PresetKey = "coherentBreathing" | "boxBreathing" | "eveningUnwind";
// Keep one source for the library and the existing selection/edit helpers.
export const presets: { key: PresetKey; rhythm: Rhythm }[] = practices
  .filter((practice) => practice.preset !== "custom")
  .map((practice) => ({
    key: practice.preset as PresetKey,
    rhythm: [...practice.rhythm],
  }));
export interface PatternSettings {
  preset: string;
  rhythm: Rhythm;
  customRhythm?: Rhythm;
}
export function editPhase(
  settings: { preset?: string; rhythm: Rhythm },
  index: number,
  duration: number,
): Rhythm {
  if (settings.preset === "boxBreathing")
    return [duration, duration, duration, duration];
  const rhythm = [...settings.rhythm] as Rhythm;
  rhythm[index] = duration;
  return rhythm;
}
const sameRhythm = (a: Rhythm, b: Rhythm) => a.every((n, i) => n === b[i]);
const boxRhythm = (rhythm: Rhythm) =>
  validRhythm(rhythm) && rhythm[0] >= 0.5 && rhythm[0] <= 40 &&
  rhythm.every((duration) => duration === rhythm[0]);
export function restorePreset(id: unknown, rhythm: Rhythm): string {
  if (id === "boxBreathing" && boxRhythm(rhythm)) return id;
  if (
    id === "custom" ||
    (typeof id === "string" &&
      id.length > 0 &&
      !presets.some((p) => p.key === id))
  )
    return "custom";
  return presets.find((p) => sameRhythm(p.rhythm, rhythm))?.key || "custom";
}
export function editRhythm<T extends PatternSettings>(
  settings: T,
  rhythm: Rhythm,
): T {
  const selected = presets.find((p) => p.key === settings.preset);
  if (selected?.key === "boxBreathing" && rhythm.every(duration => Object.is(duration, rhythm[0]))) {
    // Both the four phase controls and the guided common-duration control send
    // equal values, including temporary blank drafts. Keep their Box identity.
    return { ...settings, rhythm: [...rhythm] };
  }
  const preset =
    selected && sameRhythm(selected.rhythm, rhythm) ? selected.key : "custom";
  return {
    ...settings,
    rhythm: [...rhythm],
    preset,
    customRhythm:
      preset === "custom" && validRhythm(rhythm)
        ? [...rhythm]
        : settings.customRhythm,
  };
}
export function selectPreset<T extends PatternSettings>(
  settings: T,
  key: PresetKey,
): T {
  const preset = presets.find((p) => p.key === key)!;
  return {
    ...settings,
    preset: key,
    rhythm: [...preset.rhythm],
    customRhythm:
      settings.preset === "custom" && validRhythm(settings.rhythm)
        ? [...settings.rhythm]
        : settings.customRhythm,
  };
}
export function selectCustom<T extends PatternSettings>(settings: T): T {
  if (settings.preset === "custom") return settings;
  const rhythm = validRhythm(settings.customRhythm as Rhythm)
    ? settings.customRhythm!
    : settings.rhythm;
  return {
    ...settings,
    preset: "custom",
    rhythm: [...rhythm],
    customRhythm: validRhythm(rhythm) ? [...rhythm] : settings.customRhythm,
  };
}
