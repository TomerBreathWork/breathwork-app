import { validConfiguredRhythm, migrateRhythm } from "./duration-controls.ts";
import { restorePreset } from "./presets.ts";
import type { Rhythm } from "./engine.ts";

export const launchDefaults = {
  preset: "coherentBreathing",
  rhythm: [5.5, 0, 5.5, 0] as Rhythm,
  minutes: 3,
};
export interface LaunchConfiguration {
  preset: string;
  rhythm: Rhythm;
  minutes: number;
  customRhythm?: Rhythm;
}
export const updateHandoffKey = "breath-flow-update-configuration";
type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function configuration(value: unknown): LaunchConfiguration | undefined {
  if (!value || typeof value !== "object") return;
  const s = value as LaunchConfiguration;
  if (
    !validConfiguredRhythm(s.rhythm) ||
    !Number.isFinite(s.minutes) ||
    s.minutes < 1 ||
    s.minutes > 120
  )
    return;
  return {
    preset: restorePreset(s.preset, s.rhythm),
    rhythm: [...s.rhythm],
    minutes: s.minutes,
    customRhythm: migrateRhythm(s.customRhythm),
  };
}
/** A one-use, tab-local handoff distinguishes our safe update reload from a
 * user's reload/new launch. Never use ordinary saved timing as startup input. */
export function saveUpdateConfiguration(
  storage: StorageAccess,
  value: unknown,
  now = Date.now(),
) {
  storage.removeItem(updateHandoffKey);
  const snapshot = configuration(value);
  if (snapshot)
    storage.setItem(
      updateHandoffKey,
      JSON.stringify({ at: now, configuration: snapshot }),
    );
}
export function consumeUpdateConfiguration(
  storage: StorageAccess,
  isReload: boolean,
  now = Date.now(),
) {
  const raw = storage.getItem(updateHandoffKey);
  storage.removeItem(updateHandoffKey);
  if (!isReload || !raw) return;
  try {
    const value = JSON.parse(raw);
    // Ignore leftovers from an interrupted/crashed navigation or another launch.
    if (
      !Number.isFinite(value?.at) ||
      now < value.at ||
      now - value.at > 60_000
    )
      return;
    return configuration(value.configuration);
  } catch {
    return;
  }
}
