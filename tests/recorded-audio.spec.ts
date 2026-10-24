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
  const set={id:'recorded-test',name:'Test',recordings:{inhale:url('inhale'),holdAfterInhale:url('hold'),exhale:url('exhale'),holdAfterExhale:url('hold')},frequencies:{inhale:261.63,holdAfterInhale:392,exhale:261.63,holdAfterExhale:329.63}};
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
  const buffers:AudioBuffer[]=[];const create=offline.createBufferSource.bind(offline);
  offline.createBufferSource=()=>{const source=create(),start=source.start.bind(source);source.start=(...args)=>{buffers.push(source.buffer!);start(...args)};return source};
  const proxy=new Proxy(offline,{get(target,key){if(key==='state')return 'running';if(key==='resume')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});
  window.AudioContext=function(){return proxy} as any;
  const engine=new (window as any).AudioTest.BowlAudio();await engine.unlock();
  const mapping=(window as any).AudioTest.phaseNotes;
  const set={id:'synth',name:'Bowls',recordings:{inhale:'unused.mp3',holdAfterInhale:null,exhale:null,holdAfterExhale:null},frequencies:Object.fromEntries(Object.entries(mapping).map(([role,note])=>[role,(note as any).frequency]))};
  await engine.prepare(set);engine.run(set,[.05,.05,.05,.05],0,200);
  const result=await offline.startRendering();engine.stop();window.AudioContext=Native;
  const samples=result.getChannelData(0);
  return{sameC4:buffers[0]===buffers[2],count:buffers.length,boundaries:[0,.05,.1,.15,.2].map(t=>samples[Math.round(t*rate)]),peak:Math.max(...samples.map(Math.abs)),silenceAfter:Math.max(...samples.slice(Math.round(.201*rate)).map(Math.abs))};
 });
 expect(requested).toEqual([]);
 expect(rendered.sameC4).toBe(true);expect(rendered.count).toBe(4);
 for(const sample of rendered.boundaries)expect(Math.abs(sample)).toBeLessThan(.002);
 expect(rendered.peak).toBeGreaterThan(.01);expect(rendered.peak).toBeLessThan(1);
 expect(rendered.silenceAfter).toBe(0);
});
test('C4 voices match and all notes retain upstream loudness without clipping',async({page})=>{
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const results=await page.evaluate(async()=>{
  const rate=24000,results:{rms:number;referenceRms:number;peak:number;samples:number[]}[]=[];
  for(const frequency of [261.63,392,261.63,329.63]){
   const renders:{rms:number;peak:number;samples:number[]}[]=[];
   for(const reference of [false,true]){
    const context=new OfflineAudioContext(1,rate*6,rate),envelope=context.createGain();
    envelope.connect(context.destination);envelope.gain.setValueAtTime(1,0);envelope.gain.setValueAtTime(1,4);envelope.gain.linearRampToValueAtTime(0,5);
    let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    let voice:any;
    if(reference)(window as any).AudioTest.referenceStrike(context,envelope,frequency,random);
    else{voice=(window as any).AudioTest.createSingingBowl(context,envelope,frequency,0,0,{random});voice.sources.forEach((source:AudioScheduledSourceNode)=>{source.start(0);source.stop(5)})}
    const output=await context.startRendering(),data=output.getChannelData(0);
    let energy=0,peak=0;for(let i=0;i<rate*5;i++){energy+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]))}
    renders.push({rms:Math.sqrt(energy/(rate*5)),peak,samples:Array.from(data.slice(0,4096))});
    voice?.sources.forEach((source:AudioScheduledSourceNode)=>source.disconnect());voice?.nodes.forEach((node:AudioNode)=>node.disconnect());envelope.disconnect();
   }
   results.push({...renders[0],referenceRms:renders[1].rms});
  }
  return results;
 });
 // Retain the reference's pitch-dependent level; do not retune the engine to
 // satisfy the former G3-specific 2 dB spread threshold (G4 gives ~2.06 dB).
 const difference=Math.max(...results[0].samples.map((sample,i)=>Math.abs(sample-results[2].samples[i])));
 expect(difference).toBeLessThan(1e-6);
 for(const result of results){expect(result.rms).toBeCloseTo(result.referenceRms,6);expect(result.peak).toBeGreaterThan(.1);expect(result.peak).toBeLessThan(1)}
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

test('prepared playback preserves upstream C4 attack and processed signal, including reverb',async({page})=>{
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const comparison=await page.evaluate(async()=>{
  const rate=24000,signals:Float32Array[][]=[];
  for(const reference of [true,false]){
   const context=new OfflineAudioContext(2,rate*2,rate);
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};let seed=54321;
   if(reference)(window as any).AudioTest.referenceStrike(context,context.destination,261.63,random);
   else{
    const Native=window.AudioContext;
    const proxy=new Proxy(context,{get(target,key){if(key==='state')return 'running';if(key==='resume')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});
    window.AudioContext=function(){return proxy} as any;
    const engine=new (window as any).AudioTest.BowlAudio((c:BaseAudioContext,f:number)=>(window as any).AudioTest.renderBowl(c,f,{random}));
    await engine.unlock();const set={id:'C4',name:'C4',recordings:{},frequencies:{inhale:261.63,holdAfterInhale:261.63,exhale:261.63,holdAfterExhale:261.63}};
    await engine.prepare(set);engine.preview(set);
    const output=await context.startRendering();signals.push([output.getChannelData(0),output.getChannelData(1)]);
    engine.stop();window.AudioContext=Native;continue;
   }
   const output=await context.startRendering();signals.push([output.getChannelData(0),output.getChannelData(1)]);
  }
  let difference=0;
  for(let ch=0;ch<2;ch++)for(let i=0;i<signals[0][ch].length;i++)difference=Math.max(difference,Math.abs(signals[0][ch][i]-signals[1][ch][i]));
  return difference;
 });
 expect(comparison).toBeLessThan(1e-5);
});

test('repeated realtime C4 starts are not in the past and stopped voices clean up',async({page})=>{
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const diagnostics=await page.evaluate(async()=>{
  const Native=window.AudioContext;let context:AudioContext;const starts:number[]=[],buffers:AudioBuffer[]=[];let active=0,oscillators=0,convolvers=0;
  window.AudioContext=class extends Native{
   constructor(){super();context=this}
   createOscillator(){oscillators++;return super.createOscillator()}
   createConvolver(){convolvers++;return super.createConvolver()}
   createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.addEventListener('ended',()=>active--);source.start=(...args)=>{active++;starts.push((this.currentTime-(args[0]||0))*1000);buffers.push(source.buffer!);start(...args)};return source}
  };
  const engine=new (window as any).AudioTest.BowlAudio();await engine.unlock();
  const set={id:'C4',name:'C4',recordings:{},frequencies:{inhale:261.63,holdAfterInhale:261.63,exhale:261.63,holdAfterExhale:261.63}};
  await engine.prepare(set);
  for(let i=0;i<4;i++){engine.preview(set);await new Promise(resolve=>setTimeout(resolve,80));engine.stop();await new Promise(resolve=>setTimeout(resolve,100))}
  await context!.close();window.AudioContext=Native;
  return{starts,active,oscillators,convolvers,sameBuffer:buffers.every(buffer=>buffer===buffers[0])};
 });
 expect(diagnostics.starts).toHaveLength(4);
 expect(Math.max(...diagnostics.starts)).toBeLessThanOrEqual(0);
 expect(diagnostics.active).toBe(0);expect(diagnostics.oscillators).toBe(0);expect(diagnostics.convolvers).toBe(0);expect(diagnostics.sameBuffer).toBe(true);
});

test('prepared C4 remains below full scale at maximum master volume',async({page})=>{
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const metrics=await page.evaluate(async()=>{
  const Native=window.AudioContext,context=new OfflineAudioContext(2,24000*5,24000);
  const proxy=new Proxy(context,{get(target,key){if(key==='state')return 'running';if(key==='resume')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});
  window.AudioContext=function(){return proxy} as any;
  const engine=new (window as any).AudioTest.BowlAudio();await engine.unlock();engine.setVolume(1);
  const set={id:'C4',name:'C4',recordings:{},frequencies:{inhale:261.63,holdAfterInhale:261.63,exhale:261.63,holdAfterExhale:261.63}};
  await engine.prepare(set);engine.preview(set);const output=await context.startRendering();engine.stop();window.AudioContext=Native;
  let peak=0,nonfinite=0;
  for(let channel=0;channel<2;channel++)for(const sample of output.getChannelData(channel)){if(!Number.isFinite(sample))nonfinite++;peak=Math.max(peak,Math.abs(sample))}
  return{peak,nonfinite};
 });
 expect(metrics.nonfinite).toBe(0);expect(metrics.peak).toBeGreaterThan(.05);expect(metrics.peak).toBeLessThan(1);
});

test('production phase assignments render C4 G4 C4 E4 using the actual oscillator frequencies',async({page})=>{
 await page.goto('./');await page.addScriptTag({content:audioCode});
 const cycle=await page.evaluate(async()=>{
  const NativeAudio=window.AudioContext,NativeOffline=window.OfflineAudioContext;
  const playback=new NativeOffline(2,24000,24000);
  const frequencies=new Map<AudioBuffer,number>(),sequence:number[]=[],buffers:AudioBuffer[]=[];
  window.OfflineAudioContext=class extends NativeOffline{
   fundamental=0;
   createOscillator(){const oscillator=super.createOscillator(),start=oscillator.start.bind(oscillator);oscillator.start=(...args)=>{if(!this.fundamental)this.fundamental=oscillator.frequency.value;start(...args)};return oscillator}
   async startRendering(){const buffer=await super.startRendering();frequencies.set(buffer,this.fundamental);return buffer}
  };
  const create=playback.createBufferSource.bind(playback);
  playback.createBufferSource=()=>{const source=create(),start=source.start.bind(source);source.start=(...args)=>{buffers.push(source.buffer!);sequence.push(frequencies.get(source.buffer!)!);start(...args)};return source};
  const proxy=new Proxy(playback,{get(target,key){if(key==='state')return 'running';if(key==='resume')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});
  window.AudioContext=function(){return proxy} as any;
  const engine=new (window as any).AudioTest.BowlAudio();await engine.unlock();
  const set=(window as any).AudioTest.soundSets[0];await engine.prepare(set);engine.run(set,[.05,.05,.05,.05],0,200);
  await playback.startRendering();engine.stop();window.AudioContext=NativeAudio;window.OfflineAudioContext=NativeOffline;
  return{sequence,sameC4:buffers[0]===buffers[2]};
 });
 expect(cycle.sequence).toHaveLength(4);
 [261.63,392,261.63,329.63].forEach((frequency,index)=>expect(cycle.sequence[index]).toBeCloseTo(frequency,4));
 expect(cycle.sequence[1]).toBeGreaterThan(cycle.sequence[3]);
 expect(cycle.sequence[3]).toBeGreaterThan(cycle.sequence[0]);
 expect(cycle.sameC4).toBe(true);
});
