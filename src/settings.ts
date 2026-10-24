import { appDefaults, selectableBackgrounds } from "./media";
import { migrateRhythm } from "./duration-controls";
import { restorePreset, type PatternSettings } from "./presets";
export { presets } from "./presets";
export type Settings = typeof appDefaults &
  Pick<PatternSettings, "customRhythm">;
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem("still-settings") || "null");
    if (s && typeof s === "object") {
      const migrated = migrateRhythm(s.rhythm);
      const rhythm =
        migrated ?? ([...appDefaults.rhythm] as typeof appDefaults.rhythm);
      const preset = migrated
        ? restorePreset(s.preset, rhythm)
        : appDefaults.preset;
      return {
        ...appDefaults,
        rhythm,
        // Retired presets retain their durations as Custom; never discard a rhythm.
        preset,
        customRhythm:
          migrateRhythm(s.customRhythm) ??
          (preset === "custom" ? ([...rhythm] as typeof rhythm) : undefined),
        minutes:
          Number.isFinite(s.minutes) && s.minutes >= 1 && s.minutes <= 120
            ? s.minutes
            : appDefaults.minutes,
        sound: ["bowls", "recordings", "silent"].includes(s.sound)
          ? s.sound
          : appDefaults.sound,
        volume:
          Number.isFinite(s.volume) && s.volume >= 0 && s.volume <= 1
            ? s.volume
            : appDefaults.volume,
        background: [
          "random",
          ...selectableBackgrounds.map((a) => a.id),
        ].includes(s.background)
          ? s.background
          : "random",
      };
    }
  } catch {}
  return { ...appDefaults };
}
export const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
