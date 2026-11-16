import test from 'node:test';
import assert from 'node:assert/strict';
import {RecordedIntroduction,introductionCueAt,introductionPreferenceKey,readIntroductionPreference} from './recorded-introduction.ts';
class Media extends EventTarget {
 currentTime=0;ended=false;volume=0;preload='';paused=true;src='';playCalls=0;
 play(){this.playCalls++;this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 removeAttribute(){this.src='';}load(){}
 finish(){this.ended=true;this.dispatchEvent(new Event('ended'));}
}
function fixture(saved,playOverride){
 const values=new Map(saved?[[introductionPreferenceKey,JSON.stringify({version:1,he:saved})]]:[]);
 const calls={starts:0,unlocks:0,busy:false,hidden:false};const media=[];
 const controller=new RecordedIntroduction({start:()=>calls.starts++,unlock:()=>calls.unlocks++,busy:v=>calls.busy=v,hidden:()=>calls.hidden},src=>{const a=new Media();a.src=src;if(playOverride)a.play=playOverride;media.push(a);return a;},{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)});
 controller.configure({src:'real-recording.mp3'});return {controller,calls,media,values};
}
test('first use waits for ended, starts once and persists acknowledgment',()=>{
 const {controller:c,calls,media,values}=fixture();c.start();c.start();assert.equal(media.length,1);assert.equal(calls.starts,0);assert.equal(calls.busy,true);
 media[0].finish();media[0].finish();c.skip();c.start();assert.equal(calls.starts,1);assert.equal(JSON.parse(values.get(introductionPreferenceKey)).he.acknowledged,true);
});
test('Skip and stale ended/play callbacks cannot start twice',async()=>{
 const {controller:c,calls,media}=fixture();c.start();c.skip();media[0].finish();await Promise.resolve();c.skip();assert.equal(calls.starts,1);assert.equal(media[0].paused,true);
});
test('returning, disabled and unavailable-language starts do not play narration',()=>{
 for(const pref of [{enabled:true,acknowledged:true},{enabled:false,acknowledged:false}]){
 const {controller:c,calls,media}=fixture(pref);c.start();assert.equal(calls.starts,1);assert.equal(media.length,0);}
 const {controller:c,calls,media}=fixture();c.configure(undefined);c.start();assert.equal(calls.starts,1);assert.equal(media.length,0);
});
test('standalone Replay completion or Skip never starts a practice',()=>{
 const {controller:c,calls,media}=fixture({enabled:true,acknowledged:true});c.replay();media[0].finish();assert.equal(calls.starts,0);assert.equal(calls.busy,false);c.replay();c.skip();assert.equal(calls.starts,0);
});
test('background pause stays paused; explicit resume is required',async()=>{
 const {controller:c,calls,media}=fixture();c.start();calls.hidden=true;c.pause();await Promise.resolve();assert.equal(c.getSnapshot().status,'paused');media[0].finish();assert.equal(calls.starts,0);calls.hidden=false;assert.equal(c.getSnapshot().status,'paused');c.resume();media[0].finish();assert.equal(calls.starts,1);assert.equal(media[0].playCalls,1);
});
test('navigation, language change and preference changes cancel pending callbacks',async()=>{
 for(const cancel of [c=>c.cancel(),c=>c.configure(undefined),c=>c.setEnabled(false)]){
 const {controller:c,calls,media}=fixture();c.start();cancel(c);media[0].finish();await Promise.resolve();assert.equal(calls.starts,0);assert.equal(calls.busy,false);}
});
test('media failure offers explicit fallback, without auto-starting',()=>{
 const {controller:c,calls,media}=fixture();c.start();media[0].dispatchEvent(new Event('error'));assert.equal(c.getSnapshot().status,'error');assert.equal(calls.starts,0);c.continueWithout();c.continueWithout();assert.equal(calls.starts,1);
});
test('late rejected play promise cannot undo Skip',async()=>{
 let reject;const {controller:c,calls}=fixture(undefined,()=>new Promise((_,r)=>reject=r));c.start();c.skip();reject(new Error('Late failure'));await Promise.resolve();await Promise.resolve();assert.equal(calls.starts,1);assert.equal(c.getSnapshot().status,'idle');
});
test('cue selection uses audio position; absent verified cues stays balanced',()=>{
 assert.equal(introductionCueAt(99),'balanced');
 const measuredForTest={flower:1,candle:3,balanced:5};
 assert.equal(introductionCueAt(0,measuredForTest),'balanced');assert.equal(introductionCueAt(2,measuredForTest),'flower');assert.equal(introductionCueAt(4,measuredForTest),'candle');assert.equal(introductionCueAt(5,measuredForTest),'balanced');
});
test('preferences are independent and malformed storage defaults safely',()=>{
 assert.deepEqual(readIntroductionPreference({getItem:()=>'{'}),{enabled:true,acknowledged:false});
 const {controller:c,values}=fixture();c.setEnabled(false);assert.equal(readIntroductionPreference({getItem:k=>values.get(k)}).enabled,false);assert.deepEqual([...values.keys()],[introductionPreferenceKey]);
});
