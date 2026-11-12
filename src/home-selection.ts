import { restoreSavedConfiguration } from "./launch-configuration.ts";

/** New versions distinguish an explicit choice from an automatically saved
 * default. Legacy valid rhythms retain the fast returning-user path. */
export function hasSavedHomeSelection(saved: unknown): boolean {
  if (!saved || typeof saved !== "object") return false;
  const value = saved as Record<string, unknown>;
  if (!restoreSavedConfiguration(value).rhythm) return false;
  return value.homePracticeSelected !== false;
}
