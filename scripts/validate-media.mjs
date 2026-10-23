import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root = new URL('../public/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('media/manifest.json',root),'utf8'));
function file(path,kind){
 assert.equal(typeof path,'string','Media paths must be strings');
 const pattern=kind==='image'?/^media\/backgrounds\/[\w .\-/]+\.(jpe?g|png|webp)$/i:/^media\/audio\/[\w .\-/]+\.(mp3|wav|ogg)$/i;
 assert(pattern.test(path)&&!path.split('/').includes('..'),`Invalid ${kind} path: ${path}`);
 assert(existsSync(fileURLToPath(new URL(path,root))),`Missing media file: ${path}`);
}
assert(Array.isArray(manifest.backgrounds),'backgrounds must be an array');
const ids=new Set(['random','gradient','alpine','coast']);
for(const asset of manifest.backgrounds){
 assert(typeof asset.id==='string'&&asset.id.length>0&&!ids.has(asset.id),'Background IDs must be unique and not reserved');ids.add(asset.id);
 assert(typeof asset.name==='string'&&asset.name.trim(),'Each background needs a name');
 file(asset.file,'image');
}
assert(manifest.recordings&&typeof manifest.recordings==='object','recordings must be an object');
for(const role of ['inhale','holdAfterInhale','exhale','holdAfterExhale']){
 const path=manifest.recordings[role];
 assert(path===null||typeof path==='string',`Set ${role} to a media path or null`);
 if(path!==null)file(path,'audio');
}
console.log(`Validated ${manifest.backgrounds.length} photographs and ${Object.values(manifest.recordings).filter(Boolean).length} assigned audio roles.`);
