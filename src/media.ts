// Replace this read-only provider with a published-media API when secure admin is added.
export interface MediaAsset { id: string; name: string; description: string; url: string; kind: 'image'; published: boolean; order: number }
export interface SoundSet { id: string; name: string; roles: { inhale: number; hold: number; exhale: number; end: number } }
export const mediaAssets: MediaAsset[] = [
 {id:'alpine',name:'Alpine stillness',description:'A quiet lake beneath the mountains',url: `${import.meta.env.BASE_URL}media/alpine.webp`,kind:'image',published:true,order:0},
 {id:'coast',name:'Quiet coast',description:'Soft light over an open sea',url: `${import.meta.env.BASE_URL}media/coast.webp`,kind:'image',published:true,order:1}
];
export const soundSets: SoundSet[] = [{id:'bowls',name:'Tibetan Bowls · synthesized',roles:{inhale:220,hold:293.66,exhale:174.61,end:440}}];
export const appDefaults = {rhythm:[4,0,6,0] as [number,number,number,number],minutes:5,background:'random',sound:'bowls',volume:0.35};
export const mediaLibrary = { async listPublished() { return mediaAssets.filter(a=>a.published); } };
// Access policy is separate from the engine. Future paid access must be enforced by a server.
export interface AccessProvider { canPractice(): Promise<boolean> }
export const freeAccess: AccessProvider = { async canPractice() { return true; } };
