import { appDefaults, selectableBackgrounds } from "./media";
import { validRhythm, type Rhythm } from "./engine";
import { restorePreset, type PatternSettings } from "./presets";
export { presets } from "./presets";
export type Settings = typeof appDefaults &
  Pick<PatternSettings, "customRhythm">;
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem("still-settings") || "null");
    if (s && typeof s === "object") {
      const rhythm = validRhythm(s.rhythm)
        ? (s.rhythm as Rhythm)
        : ([...appDefaults.rhythm] as Rhythm);
      const preset = validRhythm(s.rhythm)
        ? restorePreset(s.preset, rhythm)
        : appDefaults.preset;
      return {
        ...appDefaults,
        rhythm,
        // Retired presets retain their durations as Custom; never discard a rhythm.
        preset,
        customRhythm: validRhythm(s.customRhythm)
          ? ([...s.customRhythm] as Rhythm)
          : preset === "custom"
            ? ([...rhythm] as Rhythm)
            : undefined,
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
