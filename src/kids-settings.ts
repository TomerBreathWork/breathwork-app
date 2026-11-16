import { flowerCandleRhythm } from './flower-candle.ts';
import type { Rhythm } from './engine.ts';
import type { Settings } from './settings';

export const kidsSettingsKey = 'breath-flow-kids-settings';
export interface KidsSettings { rhythm: Rhythm; minutes: number }
export function normalizeKidsSettings(value: unknown): KidsSettings {
  const s = value && typeof value === 'object' ? value as Partial<KidsSettings> : {};
  const inhale = Array.isArray(s.rhythm) ? s.rhythm[0] : NaN;
  return { rhythm: flowerCandleRhythm(inhale), minutes: typeof s.minutes === 'number' && Number.isFinite(s.minutes)
    ? Math.max(1, Math.min(120, Math.round(s.minutes))) : 1 };
}
export function loadKidsSettings(): KidsSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(kidsSettingsKey) || 'null');
    return normalizeKidsSettings(saved?.flowerCandle);
  } catch { return normalizeKidsSettings(undefined); }
}
export function saveKidsSettings(settings: KidsSettings) {
  try { localStorage.setItem(kidsSettingsKey, JSON.stringify({version:1,flowerCandle:normalizeKidsSettings(settings)})); }
  catch { /* Restricted storage never blocks practice. */ }
}
/** Copy shared preferences without ever writing the child's rhythm to adult storage. */
export function kidsSessionSettings(adult: Settings, profile: KidsSettings): Settings {
  return {...adult,...normalizeKidsSettings(profile),preset:'custom',practiceId:'flower-candle'};
}
