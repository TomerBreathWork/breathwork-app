import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BowlAudio} from './audio.ts';
import {phaseEnvelope} from './audio-envelope.ts';
import {phaseNotes,phaseRoles} from './audio-types.ts';
import {createSingingBowl} from './bowl-synth.ts';

const set={id:'test',name:'Recorded bowls',recordings:{inhale:'inhale.wav',holdAfterInhale:'hold.wav',exhale:'exhale.wav',holdAfterExhale:'hold.wav'},frequencies:Object.fromEntries(phaseRoles.map(role=>[role,phaseNotes[role].frequency]))};
class Param {
 value=0;events=[];
 setValueAtTime(v,t){this.events.push(['set',v,t]);return this}
 linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);return this}
 setTargetAtTime(v,t,c){this.events.push(['target',v,t,c]);return this}
 cancelScheduledValues(t){this.events.push(['cancel',t]);return this}
}
class Gain {gain=new Param();connect(node){this.connected=node}disconnect(){this.disconnected=true}}
class Source {
 loop=true;stops=[];
 connect(node){this.gain=node}disconnect(){this.disconnected=true}
 start(at,offset){this.startAt=at;this.offset=offset}
 stop(at){this.stops.push(at)}
}
class Oscillator extends Source {frequency=new Param();type='sine';setPeriodicWave(wave){this.wave=wave}}
class Context {
 currentTime=0;state='running';sampleRate=8000;destination={};sources=[];oscillators=[];gains=[];decodes=0;
 async resume(){}
 createPeriodicWave(real,imag,options){return {real,imag,options}}
 createGain(){const gain=new Gain();this.gains.push(gain);return gain}
 createOscillator(){const source=new Oscillator();this.oscillators.push(source);return source}
 createBufferSource(){const source=new Source();this.sources.push(source);return source}
 createBuffer(channels,length,rate){return{duration:length/rate,getChannelData:()=>new Float32Array(length)}}
 async decodeAudioData(bytes){this.decodes++;return{duration:new Uint8Array(bytes)[0]}}
}
async function setup(t,{duration=20,fail=false}={}){
 const c=new Context();let now=0;const fetched=[];
 t.mock.method(globalThis,'AudioContext',function(){return c});
 t.mock.method(performance,'now',()=>now*1000);
 t.mock.method(globalThis,'fetch',async url=>{fetched.push(url);if(fail)throw new Error('Unavailable');return{ok:true,arrayBuffer:async()=>new Uint8Array([duration]).buffer}});
 t.mock.timers.enable({apis:['setInterval']});
 const audio=new BowlAudio();await audio.unlock();await audio.prepare(set,'recorded');
 t.after(()=>audio.stop());
 return{audio,c,fetched,advance(seconds){now=seconds;c.currentTime=seconds;t.mock.timers.tick(25)}};
}
// A browser-only constructor is injected above, without requiring browser APIs in Node.
if(!globalThis.AudioContext)globalThis.AudioContext=function(){};

test('phase envelopes include exact zero boundary and proportional short fades',()=>{
 assert.deepEqual(phaseEnvelope(5),{attack:.15,fadeStart:4,end:5,peak:1});
 assert.deepEqual(phaseEnvelope(1),{attack:.15,fadeStart:.5,end:1,peak:1});
 assert.deepEqual(phaseEnvelope(.2),{attack:.05,fadeStart:.1,end:.2,peak:1});
 const resumed=phaseEnvelope(5,4.8);assert(resumed.attack<=resumed.fadeStart&&resumed.end<.201&&resumed.peak<.201);
});
test('recordings decode once; each phase is non-looping and reaches zero before next source',async t=>{
 const {audio,c,fetched,advance}=await setup(t);
 assert.equal(fetched.length,3);assert.equal(c.decodes,3);
 await audio.prepare(set,'recorded');assert.equal(fetched.length,3);
 audio.run(set,[5,3,7,2],0,17000);
 assert.equal(c.sources.length,1);
 const inhale=c.sources[0];assert.equal(inhale.buffer.duration,20);assert.equal(inhale.loop,false);
 assert.deepEqual(inhale.gain.gain.events.slice(0,4),[['set',0,0],['ramp',1,.15],['set',1,4],['ramp',0,5]]);
 for(const second of [4.8,7.8,14.8])advance(second);
 assert.equal(c.sources.length,4);
 assert.equal(c.sources[1].buffer,c.sources[3].buffer);
 assert.notEqual(c.sources[0].buffer,c.sources[2].buffer);
 for(let i=0;i<3;i++)assert.equal(c.sources[i].stops[0],c.sources[i+1].startAt);
 assert.deepEqual(c.sources.map(s=>s.startAt),[0,5,8,15]);
 advance(17);assert.equal(c.sources.length,4);
});
test('short phases and repeated cycles schedule each nonzero phase once without overlap',async t=>{
 const {audio,c,advance}=await setup(t);
 audio.run(set,[.5,0,.5,0],0,3000);
 for(let seconds=.25;seconds<3;seconds+=.25)advance(seconds);
 assert.equal(c.sources.length,6);
 assert.deepEqual(c.sources.map(s=>s.startAt),[0,.5,1,1.5,2,2.5]);
 for(let i=0;i<5;i++)assert(c.sources[i].stops[0]<=c.sources[i+1].startAt);
});
test('short recording ends naturally; resume past recording end stays silent',async t=>{
 const {audio,c,advance}=await setup(t,{duration:2});
 audio.run(set,[5,0,7,0],0,12000);assert.equal(c.sources[0].stops[0],2);
 advance(3);audio.stop();audio.run(set,[5,0,7,0],3000,12000);
 assert.equal(c.sources.length,1);
});
test('pause cancels future source, resume uses current phase offset, master is independent',async t=>{
 const {audio,c,advance}=await setup(t);
 audio.run(set,[5,3,7,2],0,17000);advance(4.8);
 assert.equal(c.sources.length,2);audio.stop();
 assert.equal(c.sources[1].stops.at(-1),4.8);
 assert(c.sources[0].stops.at(-1)<=4.85);
 const count=c.sources.length;advance(10);assert.equal(c.sources.length,count);
 audio.run(set,[5,3,7,2],4800,17000);
 const resumed=c.sources[count];assert(Math.abs(resumed.offset-4.8)<.001);
 assert(Math.abs(resumed.stops[0]-10.2)<.001);
 const events=resumed.gain.gain.events.slice();audio.setVolume(.1);
 assert.deepEqual(resumed.gain.gain.events,events);assert.equal(c.gains[0].gain.events.at(-1)[1],.1);
});
test('missing recordings use fallback; stop cancels all future playback',async t=>{
 const {audio,c,advance}=await setup(t,{fail:true});assert.equal(audio.recordingStatus,'fallback');
 audio.run(set,[1,1,1,1],0,4000);assert.equal(c.oscillators.length,8);
 audio.stop();advance(3);assert.equal(c.oscillators.length,8);assert.equal(c.sources.length,0);
});
test('the second hold can use an independent recording',async t=>{
 const {audio,c,advance}=await setup(t);
 const separate={...set,recordings:{...set.recordings,holdAfterExhale:'second-hold.ogg'}};
 await audio.prepare(separate,'recorded');audio.run(separate,[1,1,1,1],0,4000);
 for(const time of [.8,1.8,2.8])advance(time);
 assert.equal(c.sources.length,4);
 assert.notEqual(c.sources[1].buffer,c.sources[3].buffer);
});

test('default synthesis maps C4/G3/C4/E4 without loading any recordings',async t=>{
 const {audio,c,fetched,advance}=await setup(t);
 const loaded=fetched.length;await audio.prepare(set);
 assert.equal(audio.recordingStatus,'synthesized');assert.equal(fetched.length,loaded);
 audio.run(set,[1,1,1,1],0,4000);
 for(const time of [.8,1.8,2.8])advance(time);
 assert.equal(c.oscillators.length,32);assert.equal(c.sources.length,0);
 assert.deepEqual(c.oscillators.filter((_,i)=>i%8===0).map(o=>o.frequency.value),[261.63,196,261.63,329.63]);
 assert.deepEqual(c.oscillators.slice(0,8).map(o=>o.frequency.value),c.oscillators.slice(16,24).map(o=>o.frequency.value));
 for(let voice=0;voice<3;voice++)assert.equal(c.oscillators[voice*8].stops[0],c.oscillators[(voice+1)*8].startAt);
 advance(4);assert.equal(c.oscillators.length,32);
});
test('synthesized short/zero phases, rapid resume and node cleanup have no overlap',async t=>{
 const {audio,c,advance}=await setup(t);await audio.prepare(set);
 audio.run(set,[.5,0,.5,0],0,2000);advance(.25);
 const first=c.oscillators[0];audio.stop();
 const releaseEnd=first.stops.at(-1),beforeResume=c.oscillators.length;
 audio.run(set,[.5,0,.5,0],250,2000);
 const resumed=c.oscillators[beforeResume];assert(resumed.startAt>=releaseEnd);
 assert(Math.abs(resumed.stops[0]-.5)<.00001);
 const count=c.oscillators.length;audio.setVolume(.4);assert.equal(c.oscillators.length,count);
 audio.stop();advance(5);assert.equal(c.oscillators.length,count);
 for(const oscillator of c.oscillators)oscillator.onended();
 assert(c.oscillators.every(source=>source.disconnected));
 assert(c.gains.slice(1).every(gain=>gain.disconnected));
});
test('long synthesized phases sustain beyond the old four-second sample limit',async t=>{
 const {audio,c}=await setup(t);await audio.prepare(set);
 audio.run(set,[120,0,0,0],0,120000);
 assert.equal(c.oscillators.length,8);
 assert(c.oscillators.every(source=>source.stops[0]===120));
});

test('resume retains natural decay and oscillator phase instead of a fresh strike',()=>{
 const context=new Context(),destination=new Gain();
 const fresh=createSingingBowl(context,destination,261.63,0,0);
 const resumed=createSingingBowl(context,destination,261.63,10,2);
 assert(resumed.gains[0].gain.events[0][1]<fresh.gains[0].gain.events[0][1]);
 const phase=(2*Math.PI*261.63*2)%(2*Math.PI);
 assert(Math.abs(resumed.sources[0].wave.real[1]-Math.sin(phase))<1e-6);
 assert(Math.abs(resumed.sources[0].wave.imag[1]-Math.cos(phase))<1e-6);
 assert.equal(resumed.sources[0].wave.options.disableNormalization,true);
});
