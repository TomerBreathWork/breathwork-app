import { getPractice, type PracticeId, type LibraryFilter } from "./practices.ts";
import { validConfiguredRhythm } from "./duration-controls.ts";
import { normalizeBeeSettings } from "./bee-settings.ts";
import { normalizeKidsSettings } from "./kids-settings.ts";
import type { Rhythm } from "./engine.ts";

export type SetupScreen =
  | { name: "home"; mode?: "choosing" | "selected" }
  | { name: "library"; filter?: LibraryFilter }
  | { name: "details"; id: PracticeId };
export type Screen = SetupScreen | {
  name: "session"; id: string; returnTo: SetupScreen; returnIndex: number;
};
export interface NavigationDraft {
  preset: string;
  practiceId: string;
  rhythm: Rhythm;
  minutes: number;
  customRhythm?: Rhythm;
}
export interface NavigationEntry {
  owner: string;
  index: number;
  view: Screen;
  draft?: NavigationDraft;
}
export interface NavigationSnapshot {
  current: NavigationEntry;
  entries: NavigationEntry[];
}
export const navigationKey = "breathFlowNavigation";
export const chooser: SetupScreen = { name: "home", mode: "choosing" };
export function readSetupScreen(value: unknown): SetupScreen | undefined {
  if (!value || typeof value !== "object") return;
  const s = value as SetupScreen;
  if (s.name === "home") return { name: "home", mode: s.mode === "selected" ? "selected" : "choosing" };
  if (s.name === "library") return { name: "library", ...(["calm", "focus", "kids"].includes(s.filter ?? "") ? {filter:s.filter} : {}) };
  if (s.name === "details" && getPractice(s.id)) return { name: "details", id: s.id };
}
export function readDraft(value: unknown): NavigationDraft | undefined {
  const d = value as NavigationDraft | undefined;
  if (d?.practiceId === "bee-breathing") return {
    preset:"custom",practiceId:"bee-breathing",...normalizeBeeSettings(d),
  };
  if (d?.practiceId === "flower-candle") return {
    preset:"custom",practiceId:"flower-candle",...normalizeKidsSettings(d),
  };
  if (!d || !validConfiguredRhythm(d.rhythm) || !Number.isFinite(d.minutes) ||
      d.minutes < 1 || d.minutes > 120 || typeof d.preset !== "string" ||
      !(d.practiceId === "custom" || getPractice(d.practiceId))) return;
  return { preset: d.preset, practiceId: d.practiceId, rhythm: [...d.rhythm], minutes: d.minutes,
    ...(d.customRhythm && validConfiguredRhythm(d.customRhythm) ? { customRhythm: [...d.customRhythm] as Rhythm } : {}) };
}
export function readEntry(value: unknown): NavigationEntry | undefined {
  const e = value as NavigationEntry | undefined;
  if (!e || typeof e.owner !== "string" || !e.owner || !Number.isSafeInteger(e.index) || e.index < 0) return;
  let view: Screen | undefined = readSetupScreen(e.view);
  if (e.view?.name === "session") {
    const origin = readSetupScreen(e.view.returnTo);
    if (origin && typeof e.view.id === "string" && Number.isSafeInteger(e.view.returnIndex) &&
        e.view.returnIndex >= 0 && e.view.returnIndex < e.index)
      view = { name: "session", id: e.view.id, returnTo: origin, returnIndex: e.view.returnIndex };
  }
  return view ? { owner: e.owner, index: e.index, view, draft: readDraft(e.draft) } : undefined;
}
export function readNavigationSnapshot(value: unknown): NavigationSnapshot | undefined {
  const s = value as NavigationSnapshot | undefined;
  const current = readEntry(s?.current);
  if (!current || !Array.isArray(s?.entries)) return;
  const entries = s.entries.map(readEntry).filter((e): e is NavigationEntry => !!e && e.owner === current.owner);
  return { current, entries };
}
export function screenFromHistory(state: unknown): SetupScreen {
  const s = state as Record<string, unknown> | null;
  const entry = readEntry(s?.[navigationKey]);
  // Retain the legacy decoder for old entries and existing consumers.
  if (entry && entry.view.name !== "session") return entry.view;
  const view = s?.breathFlowView as SetupScreen | undefined;
  if (view?.name === "library") return { name: "library" };
  if (view?.name === "details" && getPractice(view.id)) return { name: "details", id: view.id };
  return { name: "home" };
}
