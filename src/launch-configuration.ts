import { getPractice, practiceForPreset } from "./practices.ts";
import { validConfiguredRhythm, migrateRhythm } from "./duration-controls.ts";
import { restorePreset } from "./presets.ts";
import type { Rhythm } from "./engine.ts";

export const launchDefaults = {
  preset: "coherentBreathing",
  rhythm: [...getPractice("coherent")!.rhythm] as Rhythm,
  minutes: 3,
  practiceId: "coherent",
};
export interface LaunchConfiguration {
  preset: string;
  practiceId: string;
  rhythm: Rhythm;
  minutes: number;
  customRhythm?: Rhythm;
}
/** Restore valid saved choices, migrating legacy bounds without losing Custom.
 * Missing/invalid timing keeps the default; secondary preferences load separately. */
export function restoreSavedConfiguration(
  value: unknown,
): Partial<LaunchConfiguration> {
  if (!value || typeof value !== "object") return {};
  const s = value as Partial<LaunchConfiguration>;
  const result: Partial<LaunchConfiguration> = {};
  const rhythm = migrateRhythm(s.rhythm);
  if (rhythm) {
    const preset = restorePreset(s.preset, rhythm);
    const practice = getPractice(s.practiceId);
    result.rhythm = rhythm;
    result.preset = preset;
    result.practiceId =
      practice && (s.preset === "custom" || practice.preset === preset)
        ? practice.id
        : practiceForPreset(preset);
  }
  if (
    typeof s.minutes === "number" &&
    Number.isFinite(s.minutes) &&
    s.minutes >= 1 &&
    s.minutes <= 120
  )
    result.minutes = s.minutes;
  const customRhythm = migrateRhythm(s.customRhythm);
  if (customRhythm) result.customRhythm = customRhythm;
  return result;
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
    practiceId:
      getPractice(s.practiceId)?.id ??
      practiceForPreset(restorePreset(s.preset, s.rhythm)),
    rhythm: [...s.rhythm],
    minutes: s.minutes,
    customRhythm: migrateRhythm(s.customRhythm),
  };
}
/** A one-use, tab-local handoff distinguishes our safe update reload from a
 * user's reload/new launch. This tab-local snapshot takes precedence over the
 * shared saved choices, so a different tab cannot overwrite an update handoff. */
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
