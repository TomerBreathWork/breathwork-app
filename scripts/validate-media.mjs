import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const root = new URL('../public/',import.meta.url);
export function validateManifest(manifest, publicRoot=root) {
 function file(path,kind){
  assert.equal(typeof path,'string','Media paths must be strings');
  const pattern=kind==='image'?/^media\/backgrounds\/[\w .\-/]+\.(jpe?g|png|webp)$/i:/^media\/audio\/[\w .\-/]+\.(mp3|wav|ogg)$/i;
  assert(pattern.test(path)&&!path.split('/').includes('..'),`Invalid ${kind} path: ${path}`);
  assert(existsSync(fileURLToPath(new URL(path,publicRoot))),`Missing media file: ${path}`);
 }
 assert(Array.isArray(manifest.backgrounds),'backgrounds must be an array');
 const ids=new Set(['random','gradient','alpine','coast']);
 for(const [index,asset] of manifest.backgrounds.entries()){
  assert(asset&&typeof asset==='object'&&!Array.isArray(asset),`Background ${index+1} must be an object with id, name and file (not a path string)`);
  assert(typeof asset.id==='string'&&asset.id.trim(),`Background ${index+1} needs a nonempty id`);
  assert(!ids.has(asset.id),`Duplicate or reserved background id: ${asset.id}`);ids.add(asset.id);
  assert(typeof asset.name==='string'&&asset.name.trim(),'Each background needs a name');
  file(asset.file,'image');
 }
 assert(manifest.recordings&&typeof manifest.recordings==='object','recordings must be an object');
 for(const role of ['inhale','holdAfterInhale','exhale','holdAfterExhale']){
  const path=manifest.recordings[role];
  assert(path===null||typeof path==='string',`Set ${role} to a media path or null`);
  if(path!==null)file(path,'audio');
 }
 return {backgrounds:manifest.backgrounds.length,audioRoles:Object.values(manifest.recordings).filter(Boolean).length};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const manifest=JSON.parse(readFileSync(new URL('media/manifest.json',root),'utf8'));
 const result=validateManifest(manifest);
 console.log(`Validated ${result.backgrounds} photographs and ${result.audioRoles} assigned audio roles.`);
}
