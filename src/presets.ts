import { validRhythm, type Rhythm } from "./engine.ts";

// IDs stay stable across the renamed buttons, preserving saved configurations.
export type PresetKey = "coherentBreathing" | "boxBreathing" | "eveningUnwind";
export const presets: { key: PresetKey; rhythm: Rhythm }[] = [
  { key: "coherentBreathing", rhythm: [5.5, 0, 5.5, 0] },
  { key: "boxBreathing", rhythm: [4, 4, 4, 4] },
  { key: "eveningUnwind", rhythm: [4, 7, 8, 0] },
];
export interface PatternSettings {
  preset: string;
  rhythm: Rhythm;
  customRhythm?: Rhythm;
}
const sameRhythm = (a: Rhythm, b: Rhythm) => a.every((n, i) => n === b[i]);
export function restorePreset(id: unknown, rhythm: Rhythm): string {
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
