import { appDefaults, selectableBackgrounds } from "./media";
import { hasSavedHomeSelection } from "./home-selection";
import type { NavigationSnapshot } from "./navigation";
import { type PatternSettings } from "./presets";
import {
  consumeUpdateConfiguration,
  saveUpdateConfiguration,
  restoreSavedConfiguration,
  type LaunchConfiguration,
} from "./launch-configuration";
export { presets } from "./presets";
export type Settings = typeof appDefaults &
  Pick<PatternSettings, "customRhythm"> & { homePracticeSelected?: boolean };
// Consume once per document, outside React's double-invoked StrictMode initializer.
const updateConfiguration = (() => {
  try {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return consumeUpdateConfiguration(
      sessionStorage,
      navigation?.type === "reload",
    );
  } catch {
    return;
  }
})();
const { navigation: launchNavigation, ...updateSettings }: Partial<LaunchConfiguration> = updateConfiguration ?? {};
export { launchNavigation };
export function preserveConfigurationForUpdate(settings: Settings, navigation?: NavigationSnapshot) {
  try {
    saveUpdateConfiguration(sessionStorage, { ...settings, navigation });
  } catch {
    /* Restricted storage must never prevent an update or break practice. */
  }
}
export function loadSettings(): Settings {
  const initial = {
    ...appDefaults,
    homePracticeSelected: false,
    ...updateSettings,
    rhythm: [
      ...(updateSettings?.rhythm ?? appDefaults.rhythm),
    ] as typeof appDefaults.rhythm,
  };
  try {
    const s = JSON.parse(localStorage.getItem("still-settings") || "null");
    if (s && typeof s === "object") {
      return {
        ...initial,
        ...restoreSavedConfiguration(s),
        ...updateSettings,
        homePracticeSelected: updateSettings?.homePracticeSelected ?? hasSavedHomeSelection(s),
        sound: ["bowls", "recordings", "silent"].includes(s.sound)
          ? s.sound
          : appDefaults.sound,
        volume:
          // The hidden legacy 0.35 master caused quiet output even after mix
          // boosts. Migrate only audio level once; retain all other preferences.
          s.audioOutputVersion === appDefaults.audioOutputVersion &&
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
  return initial;
}
export const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
