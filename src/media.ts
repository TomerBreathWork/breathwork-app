import manifest from '../public/media/manifest.json';

export interface MediaAsset { id: string; name: string; description: string; url: string; kind: 'image'; published: boolean; order: number }
export type {PhaseRole, SoundSet} from './audio-types';
import {phaseRoles, type PhaseRole, type SoundSet} from './audio-types';
interface BackgroundEntry { id: string; name: string; description?: string; file: string; published?: boolean }
// All configured files are local public assets. A future provider can supply published URLs.
export function mediaUrl(file: string): string {
 if (file.startsWith('/') || file.split('/').includes('..') || !/^media\/[\w .\-/]+\.(jpe?g|png|webp|mp3|wav|ogg)$/i.test(file)) throw new Error(`Invalid local media path: ${file}`);
 return `${import.meta.env.BASE_URL}${file.split('/').map(encodeURIComponent).join('/')}`;
}
export const fallbackAssets: MediaAsset[] = [
 {id:'alpine',name:'Alpine stillness',description:'Illustrated mountain lake in soft morning light',url:mediaUrl('media/alpine.webp'),kind:'image',published:true,order:0},
 {id:'coast',name:'Quiet coast',description:'Illustrated open sea',url:mediaUrl('media/coast.webp'),kind:'image',published:true,order:1}
];
const photographs: MediaAsset[] = (manifest.backgrounds as BackgroundEntry[]).filter(a=>a.published!==false).map((a,order)=>({id:a.id,name:a.name,description:a.description||a.name,url:mediaUrl(a.file),kind:'image',published:true,order}));
export const mediaAssets = photographs.length ? photographs : fallbackAssets;
export const selectableBackgrounds = [...mediaAssets,...fallbackAssets.filter(a=>!mediaAssets.some(b=>b.id===a.id))];
export function chooseBackground(selection: string, previous: string, random = Math.random): MediaAsset | undefined {
 if(selection !== 'random') return selectableBackgrounds.find(a=>a.id===selection);
 const other=mediaAssets.filter(a=>a.id!==previous);
 const pool=other.length?other:mediaAssets;
 return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
export const soundSets: SoundSet[] = [{
 id:'bowls',name:'Tibetan Bowls',
 recordings:Object.fromEntries(phaseRoles.map(role=>[role,manifest.recordings[role] ? mediaUrl(manifest.recordings[role]!) : null])) as Record<PhaseRole,string|null>,
 frequencies:{inhale:261.63,holdAfterInhale:329.63,exhale:196,holdAfterExhale:329.63}
}];
export const hasRecordings=Object.values(soundSets[0].recordings).some(Boolean);
export const appDefaults = {rhythm:[4,0,6,0] as [number,number,number,number],minutes:5,background:'random',sound:'bowls',volume:0.35};
export const mediaLibrary = { async listPublished() { return mediaAssets.filter(a=>a.published); } };
export interface AccessProvider { canPractice(): Promise<boolean> }
export const freeAccess: AccessProvider = { async canPractice() { return true; } };
