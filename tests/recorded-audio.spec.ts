import { test, expect } from '@playwright/test';
import { build } from 'vite';
import { resolve } from 'node:path';

let audioCode: string;
test.beforeAll(async()=>{
 // Bundle the real audio engine into a test-only script, never into the public app.
 const result=await build({configFile:false,logLevel:'silent',build:{write:false,lib:{entry:resolve('tests/audio-harness.ts'),name:'AudioTest',formats:['iife']}}});
 const output=(Array.isArray(result)?result[0]:result).output;
 const chunk=output.find(item=>item.type==='chunk');
 if(!chunk||chunk.type!=='chunk')throw new Error('Audio test bundle missing');
 audioCode=chunk.code;
});
function recording(){
 const rate=24000, length=rate*2;
 const wav=Buffer.alloc(44+length*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*2,40);
 // Constant test signal lets rendered sample amplitudes measure gain directly.
 for(let i=0;i<length;i++)wav.writeInt16LE(16000,44+i*2);
 return wav;
}

test('real WAV decoding and rendered phase fades are silent at every boundary',async({page})=>{
 const requests:string[]=[];
 await page.route('**/media/audio/test-*.wav',route=>{requests.push(route.request().url());return route.fulfill({contentType:'audio/wav',body:recording()})});
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const rendered=await page.evaluate(async()=>{
  const Native=window.AudioContext;
  // Render with the actual browser Web Audio implementation, faster than real time.
  const sampleRate=24000;
  const offline=new OfflineAudioContext(1,sampleRate*2,sampleRate);
  const proxy=new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='resume')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});
  window.AudioContext=function(){return proxy} as any;
  const engine=new (window as any).AudioTest.BowlAudio();
  await engine.unlock();engine.setVolume(.5);
  const url=(name:string)=>`${location.origin}/breathwork-app/media/audio/test-${name}.wav`;
  const set={id:'recorded-test',name:'Test',recordings:{inhale:url('inhale'),holdAfterInhale:url('hold'),exhale:url('exhale'),holdAfterExhale:url('hold')},frequencies:{inhale:261.63,holdAfterInhale:329.63,exhale:196,holdAfterExhale:329.63}};
  await engine.prepare(set,'recorded');
  engine.run(set,[.05,.05,.05,.05],0,200);
  const output=await offline.startRendering();engine.stop();window.AudioContext=Native;
  const samples=output.getChannelData(0);
  const at=(seconds:number)=>samples[Math.round(seconds*sampleRate)];
  return{status:engine.recordingStatus,boundaries:[0,.05,.1,.15,.2].map(at),peaks:[.02,.07,.12,.17].map(at),silenceAfter:Math.max(...samples.slice(Math.round(.201*sampleRate)).map(Math.abs))};
 });
 expect(requests).toHaveLength(3);
 expect(rendered.status).toBe('recorded');
 for(const sample of rendered.boundaries)expect(Math.abs(sample)).toBeLessThan(.002);
 for(const sample of rendered.peaks)expect(sample).toBeGreaterThan(.1);
 expect(rendered.silenceAfter).toBe(0);
});

test('synthesized bowl envelopes render silence at boundaries, without recording requests',async({page})=>{
 const requested:string[]=[];page.on('request',request=>{if(request.url().includes('/media/audio/'))requested.push(request.url())});
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const rendered=await page.evaluate(async()=>{
  const Native=window.AudioContext,rate=24000;
  const offline=new OfflineAudioContext(1,rate,rate);
  const notes:number[]=[];const create=offline.createOscillator.bind(offline);
  offline.createOscillator=()=>{const oscillator=create();const start=oscillator.start.bind(oscillator);oscillator.start=(...args)=>{notes.push(oscillator.frequency.value);start(...args)};return oscillator};
  const proxy=new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='resume')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});
  window.AudioContext=function(){return proxy} as any;
  const engine=new (window as any).AudioTest.BowlAudio();await engine.unlock();
  const mapping=(window as any).AudioTest.phaseNotes;
  const set={id:'synth',name:'Bowls',recordings:{inhale:'unused.mp3',holdAfterInhale:null,exhale:null,holdAfterExhale:null},frequencies:Object.fromEntries(Object.entries(mapping).map(([role,note])=>[role,(note as any).frequency]))};
  await engine.prepare(set);engine.run(set,[.05,.05,.05,.05],0,200);
  const result=await offline.startRendering();engine.stop();window.AudioContext=Native;
  const samples=result.getChannelData(0);
  return{notes,boundaries:[0,.05,.1,.15,.2].map(t=>samples[Math.round(t*rate)]),peak:Math.max(...samples.map(Math.abs)),silenceAfter:Math.max(...samples.slice(Math.round(.201*rate)).map(Math.abs))};
 });
 expect(requested).toEqual([]);
 const fundamentals=rendered.notes.filter((_,i)=>i%8===0);
 expect(fundamentals).toHaveLength(4);
 [261.63,196,261.63,329.63].forEach((frequency,i)=>expect(fundamentals[i]).toBeCloseTo(frequency,4));
 for(const sample of rendered.boundaries)expect(Math.abs(sample)).toBeLessThan(.002);
 expect(rendered.peak).toBeGreaterThan(.01);expect(rendered.peak).toBeLessThan(1);
 expect(rendered.silenceAfter).toBe(0);
});
test('rendered C4 voices match and G3/C4/E4 have comparable levels and no clipping',async({page})=>{
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const results=await page.evaluate(async()=>{
  const rate=24000,results:{rms:number;peak:number;samples:number[]}[]=[];
  for(const frequency of [261.63,196,261.63,329.63]){
   const context=new OfflineAudioContext(1,rate*6,rate),envelope=context.createGain();
   envelope.connect(context.destination);envelope.gain.setValueAtTime(1,0);envelope.gain.setValueAtTime(1,4);envelope.gain.linearRampToValueAtTime(0,5);
   let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
   const voice=(window as any).AudioTest.createSingingBowl(context,envelope,frequency,0,0,{random});
   voice.sources.forEach((source:OscillatorNode)=>{source.start(0);source.stop(5)});
   const output=await context.startRendering(),data=output.getChannelData(0);
   let energy=0,peak=0;for(let i=0;i<rate*5;i++){energy+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]))}
   results.push({rms:Math.sqrt(energy/(rate*5)),peak,samples:Array.from(data.slice(0,4096))});
   voice.sources.forEach((source:OscillatorNode)=>source.disconnect());voice.nodes.forEach((node:AudioNode)=>node.disconnect());envelope.disconnect();
  }
  return results;
 });
 // Browser AudioParams and rendered samples use float32 precision.
 const difference=Math.max(...results[0].samples.map((sample,i)=>Math.abs(sample-results[2].samples[i])));
 expect(difference).toBeLessThan(1e-6);
 const rms=results.map(result=>result.rms);
 expect(20*Math.log10(Math.max(...rms)/Math.min(...rms))).toBeLessThan(2);
 for(const result of results){expect(result.peak).toBeGreaterThan(.1);expect(result.peak).toBeLessThan(1)}
});

test('struck bowl audio matches extracted upstream attack, resonance, reverb and compression',async({page})=>{
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const comparison=await page.evaluate(async()=>{
  const rate=24000,signals:Float32Array[]=[];
  for(const reference of [true,false]){
   const context=new OfflineAudioContext(2,rate*2,rate);
   let seed=54321;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
   if(reference)(window as any).AudioTest.referenceStrike(context,context.destination,261.63,random);
   else {
    const voice=(window as any).AudioTest.createSingingBowl(context,context.destination,261.63,0,0,{random});
    voice.sources.forEach((source:AudioScheduledSourceNode)=>{source.start(0);source.stop(2)});
   }
   signals.push((await context.startRendering()).getChannelData(0));
  }
  let difference=0,energy=0;
  for(let i=0;i<signals[0].length;i++){difference=Math.max(difference,Math.abs(signals[0][i]-signals[1][i]));if(i<rate*.05)energy+=signals[1][i]**2}
  return{difference,attackRms:Math.sqrt(energy/(rate*.05))};
 });
 expect(comparison.difference).toBeLessThan(1e-5);
 expect(comparison.attackRms).toBeGreaterThan(.03);
});
