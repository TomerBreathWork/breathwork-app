import test from 'node:test';
import assert from 'node:assert/strict';
import {beeAt,beeRhythm} from './bee-breathing.ts';
import {normalizeBeeSettings,loadBeeSettings,saveBeeSettings,beeSettingsKey,beeSessionSettings} from './bee-settings.ts';
import {kidsSessionSettings,normalizeKidsSettings} from './kids-settings.ts';
import {RecordedIntroduction,introductionCueAt,introductionPreferenceKey} from './recorded-introduction.ts';
import {readDraft} from './navigation.ts';
import {finishAt} from './engine.ts';
const store=()=>{const data=new Map();return{data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
test('Bee defaults and all 45 independent combinations retain exact full cycles and no holds',()=>{
 assert.deepEqual(normalizeBeeSettings(undefined),{rhythm:[3,0,5,0],minutes:1});
 for(let inhale=2;inhale<=6;inhale++)for(let exhale=4;exhale<=12;exhale++){
  const r=beeRhythm([inhale,99,exhale,99]);assert.deepEqual(r,[inhale,0,exhale,0]);assert.ok(finishAt(1,r)>=60000);assert.equal(finishAt(1,r)%((inhale+exhale)*1000),0);
 }
 assert.equal(finishAt(1,[3,0,5,0]),64000);
});
test('invalid stored/history values normalize safely at both independent boundaries',()=>{
 assert.deepEqual(normalizeBeeSettings({rhythm:[100,20,-10,20],minutes:500}),{rhythm:[6,0,4,0],minutes:120});
 assert.deepEqual(normalizeBeeSettings({rhythm:[2.7,20,8.6,20],minutes:2.2}),{rhythm:[3,0,9,0],minutes:2});
 assert.deepEqual(readDraft({practiceId:'bee-breathing',rhythm:[0,1,22,1],minutes:0,customRhythm:[8,8,8,8]}),{practiceId:'bee-breathing',preset:'custom',rhythm:[2,0,12,0],minutes:1});
});
test('Bee settings never overwrite Flower, adult choices, or unrelated preferences',()=>{
 const storage=store();globalThis.localStorage=storage;storage.setItem('still-settings','adult');storage.setItem('breath-flow-kids-settings','flower');
 saveBeeSettings({rhythm:[4,9,10,9],minutes:2});assert.deepEqual(loadBeeSettings(),{rhythm:[4,0,10,0],minutes:2});
 assert.equal(storage.getItem('still-settings'),'adult');assert.equal(storage.getItem('breath-flow-kids-settings'),'flower');assert.ok(storage.data.has(beeSettingsKey));
 const adult={rhythm:[6,2,7,1],minutes:4,preset:'custom',practiceId:'custom',volume:.5,sound:'recordings',background:'photo-2'};
 const before=JSON.stringify(adult);const bee=beeSessionSettings(adult,{rhythm:[3,3,8,3],minutes:1});assert.deepEqual(bee.rhythm,[3,0,8,0]);assert.equal(bee.practiceId,'bee-breathing');assert.equal(JSON.stringify(adult),before);
 assert.deepEqual(kidsSessionSettings(adult,normalizeKidsSettings(undefined)).rhythm,[2,0,4,0]);delete globalThis.localStorage;
});
test('one full figure eight occupies one normalized exhale at every supported duration',()=>{
 const start=beeAt(2,0);for(const seconds of [4,5,6,7,8,9,10,11,12]){
  const end=beeAt(2,seconds/seconds);assert.ok(Math.abs(end.x-start.x)<1e-10);assert.ok(Math.abs(end.y-start.y)<1e-10);
  assert.equal(beeAt(2,.25).x,82);assert.ok(Math.abs(beeAt(2,.5).x-50)<1e-10);assert.equal(beeAt(2,.75).x,18);
  for(let elapsed=0;elapsed<=seconds*1000;elapsed+=10){const p=beeAt(2,elapsed/(seconds*1000));assert.ok(p.x>=18&&p.x<=82);assert.ok(p.y>=27&&p.y<=73);}
 }
});
test('pause has deterministic coordinates; inhale boundaries and reduced motion stay centered',()=>{
 assert.deepEqual(beeAt(2,.373),beeAt(2,.373));assert.deepEqual(beeAt(0,0),beeAt(2,0));assert.deepEqual(beeAt(0,1),beeAt(0,0));
 for(const p of [0,.2,.5,.9,1])assert.deepEqual(beeAt(2,p,true),{x:50,y:50,scale:1});
});
test('confirmed Bee narration cues are audio-position based and distinct from Flower cues',()=>{
 const timeline=[{at:3,cue:'inhale'},{at:7,cue:'ears'},{at:13,cue:'hum'},{at:29,cue:'balanced'}];
 for(const [time,cue]of [[0,'balanced'],[3,'inhale'],[7,'ears'],[13,'hum'],[29,'balanced']])assert.equal(introductionCueAt(time,undefined,timeline),cue);
});
test('the same player keeps Bee acknowledgment and voice preference separate from Flower',()=>{
 const storage=store();storage.setItem(introductionPreferenceKey,JSON.stringify({version:1,he:{enabled:false,acknowledged:true}}));
 const actions={start(){},busy(){},unlock(){},hidden:()=>false};
 const player=new RecordedIntroduction(actions,()=>{throw Error('Unavailable');},storage,'breath-flow-bee-introduction');player.configure({src:'bee.mp3'});
 assert.equal(player.getSnapshot().enabled,true);assert.equal(player.getSnapshot().acknowledged,false);player.setEnabled(false);
 assert.equal(JSON.parse(storage.getItem(introductionPreferenceKey)).he.acknowledged,true);assert.equal(JSON.parse(storage.getItem('breath-flow-bee-introduction')).he.enabled,false);
});
