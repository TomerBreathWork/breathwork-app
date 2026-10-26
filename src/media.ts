import manifest from '../public/media/manifest.json';
import {resolveMediaPath} from './media-path';
import {launchDefaults} from './launch-configuration';

export interface MediaAsset { id: string; name: string; description: string; url: string; kind: 'image'; published: boolean; order: number }
export type {PhaseRole, SoundSet} from './audio-types';
import {phaseRoles, phaseNotes, type PhaseRole, type SoundSet} from './audio-types';
interface BackgroundEntry { id: string; name: string; description?: string; file: string; published?: boolean }
// All configured files are local public assets. A future provider can supply published URLs.
export function mediaUrl(file: unknown): string | null {
 return resolveMediaPath(file,import.meta.env.BASE_URL);
}
export const fallbackAssets: MediaAsset[] = [
 {id:'alpine',name:'Alpine stillness',description:'Illustrated mountain lake in soft morning light',url:mediaUrl('media/alpine.webp')!,kind:'image',published:false,order:0},
 {id:'coast',name:'Quiet coast',description:'Illustrated open sea',url:mediaUrl('media/coast.webp')!,kind:'image',published:false,order:1}
];
const entries: unknown[] = Array.isArray(manifest.backgrounds) ? manifest.backgrounds : [];
const usedIds = new Set(['random','gradient',...fallbackAssets.map(a=>a.id)]);
const photographs: MediaAsset[] = entries.flatMap((entry,order)=>{
 if(!entry||typeof entry!=='object')return [];
 const a=entry as BackgroundEntry;
 const url=mediaUrl(a.file);
 // Only the five uploaded real photographs are eligible for session selection.
 if(typeof a.file!=='string'||!/^media\/backgrounds\/[1-5]\.webp$/.test(a.file))return [];
 if(a.published===false||typeof a.id!=='string'||!a.id.trim()||usedIds.has(a.id)||typeof a.name!=='string'||!a.name.trim()||!url)return [];
 usedIds.add(a.id);
 return [{id:a.id,name:a.name,description:typeof a.description==='string'?a.description:a.name,url,kind:'image' as const,published:true,order}];
});
export const mediaAssets = photographs;
export const selectableBackgrounds = mediaAssets;
export function chooseBackground(selection: string, previous: string, random = Math.random): MediaAsset | undefined {
 if(selection !== 'random') return selectableBackgrounds.find(a=>a.id===selection);
 const other=mediaAssets.filter(a=>a.id!==previous);
 const pool=other.length?other:mediaAssets;
 return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
export const soundSets: SoundSet[] = [{
 id:'bowls',name:'Tibetan Bowls',
 recordings:Object.fromEntries(phaseRoles.map(role=>[role,mediaUrl(manifest.recordings?.[role])])) as Record<PhaseRole,string|null>,
 frequencies:Object.fromEntries(phaseRoles.map(role=>[role,phaseNotes[role].frequency])) as Record<PhaseRole,number>
}];
export const hasRecordings=Object.values(soundSets[0].recordings).some(Boolean);
export const appDefaults = {...launchDefaults,background:'random',sound:'bowls',volume:0.35};
export const mediaLibrary = { async listPublished() { return mediaAssets.filter(a=>a.published); } };
export interface AccessProvider { canPractice(): Promise<boolean> }
export const freeAccess: AccessProvider = { async canPractice() { return true; } };
