import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateManifest} from '../scripts/validate-media.mjs';
import {resolveMediaPath} from './media-path.ts';
const manifest=JSON.parse(readFileSync(new URL('../public/media/manifest.json',import.meta.url),'utf8'));
test('uploaded photographs have distinct IDs and all media paths exist',()=>{
 assert.deepEqual(validateManifest(manifest),{backgrounds:6,audioRoles:4});
 assert.equal(new Set(manifest.backgrounds.map(a=>a.id)).size,6);
 assert.notEqual(manifest.recordings.inhale,manifest.recordings.exhale);
 assert.equal(manifest.recordings.holdAfterInhale,manifest.recordings.holdAfterExhale);
});
test('the original path-string manifest reports a schema error, not duplicate IDs',()=>{
 assert.throws(()=>validateManifest({...manifest,backgrounds:['backgrounds/1.webp']}),/must be an object with id, name and file/);
});
test('genuine duplicate IDs and built-in ID collisions are rejected precisely',()=>{
 const first=manifest.backgrounds[0];
 assert.throws(()=>validateManifest({...manifest,backgrounds:[first,first]}),/Duplicate or reserved background id: photo-1/);
 for(const id of ['alpine','coast','random','gradient'])assert.throws(()=>validateManifest({...manifest,backgrounds:[{...first,id}]}),new RegExp(`Duplicate or reserved background id: ${id}`));
});
test('spaces and uppercase extensions retain their case and encode for GitHub Pages',()=>{
 assert.equal(resolveMediaPath('media/audio/inhale 4.MP3','/breathwork-app/'),'/breathwork-app/media/audio/inhale%204.MP3');
 assert.equal(resolveMediaPath('media/backgrounds/1.webp','/breathwork-app/'),'/breathwork-app/media/backgrounds/1.webp');
});
test('invalid runtime paths are ignored instead of throwing',()=>{
 for(const path of [null,undefined,{},'backgrounds/1.webp','../photo.webp','media/../photo.webp','https://example.com/photo.webp'])assert.equal(resolveMediaPath(path,'/breathwork-app/'),null);
});
