import { test, expect } from '@playwright/test';
import { build } from 'vite';
import { resolve } from 'node:path';

let audioCode: string;
test.beforeAll(async()=>{
 // Bundle the real audio engine into a test-only script, never into the public app.
 const result=await build({configFile:false,logLevel:'silent',build:{write:false,lib:{entry:resolve('src/audio.ts'),name:'AudioTest',formats:['iife']}}});
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
  await engine.prepare(set);
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
