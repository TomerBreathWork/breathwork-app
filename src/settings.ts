import { appDefaults, selectableBackgrounds } from "./media";
import { validRhythm, type Rhythm } from "./engine";
import type { TranslationKey } from "./i18n";
export type Settings = typeof appDefaults;
export const presets: { key: TranslationKey; rhythm: Rhythm }[] = [
  { key: "slowSteady", rhythm: [4, 0, 6, 0] },
  { key: "boxBreathing", rhythm: [4, 4, 4, 4] },
  { key: "eveningUnwind", rhythm: [4, 7, 8, 0] },
];
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem("still-settings") || "null");
    if (
      s &&
      Array.isArray(s.rhythm) &&
      s.rhythm.length === 4 &&
      validRhythm(s.rhythm) &&
      Number.isFinite(s.minutes) &&
      s.minutes >= 1 &&
      s.minutes <= 120 &&
      ["bowls", "recordings", "silent"].includes(s.sound) &&
      Number.isFinite(s.volume) &&
      s.volume >= 0 &&
      s.volume <= 1
    )
      return {
        ...s,
        background: [
          "random",
          "gradient",
          ...selectableBackgrounds.map((a) => a.id),
        ].includes(s.background)
          ? s.background
          : "random",
      };
  } catch {}
  return { ...appDefaults };
}
export const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
