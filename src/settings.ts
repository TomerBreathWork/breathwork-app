import { appDefaults, selectableBackgrounds } from "./media";
import { validRhythm, type Rhythm } from "./engine";
import type { TranslationKey } from "./i18n";
export type Settings = typeof appDefaults;
export const presets: { key: TranslationKey; rhythm: Rhythm }[] = [
  { key: "coherentBreathing", rhythm: [5.5, 0, 5.5, 0] },
  { key: "slowSteady", rhythm: [4, 0, 6, 0] },
  { key: "boxBreathing", rhythm: [4, 4, 4, 4] },
  { key: "eveningUnwind", rhythm: [4, 7, 8, 0] },
];
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem("still-settings") || "null");
    if (s && typeof s === "object") {
      const rhythm = validRhythm(s.rhythm)
        ? (s.rhythm as Rhythm)
        : ([...appDefaults.rhythm] as Rhythm);
      const matching = presets.find((p) =>
        p.rhythm.every((n, i) => rhythm[i] === n),
      );
      return {
        ...appDefaults,
        rhythm,
        // Legacy saved rhythms are explicit choices, even without a preset ID.
        // A Custom choice stays Custom when its values happen to match a preset.
        preset: validRhythm(s.rhythm)
          ? s.preset === "custom"
            ? "custom"
            : matching?.key || "custom"
          : appDefaults.preset,
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
