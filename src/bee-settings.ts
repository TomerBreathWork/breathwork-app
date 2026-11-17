import { beeRhythm } from './bee-breathing.ts';
import type { KidsSettings } from './kids-settings.ts';
import type { Settings } from './settings.ts';
export const beeSettingsKey='breath-flow-bee-settings';
export function normalizeBeeSettings(value:unknown):KidsSettings {
 const s=value && typeof value==='object'?value as Partial<KidsSettings>:{};
 return {rhythm:beeRhythm(s.rhythm),minutes:typeof s.minutes==='number'&&Number.isFinite(s.minutes)?Math.max(1,Math.min(120,Math.round(s.minutes))):1};
}
export function loadBeeSettings():KidsSettings {
 try{return normalizeBeeSettings(JSON.parse(localStorage.getItem(beeSettingsKey)||'null')?.beeBreathing);}catch{return normalizeBeeSettings(undefined);}
}
export function saveBeeSettings(value:KidsSettings) {
 try{localStorage.setItem(beeSettingsKey,JSON.stringify({version:1,beeBreathing:normalizeBeeSettings(value)}));}catch{/* Optional storage. */}
}
export function beeSessionSettings(adult:Settings,value:KidsSettings):Settings {
 return {...adult,...normalizeBeeSettings(value),preset:'custom',practiceId:'bee-breathing'};
}
