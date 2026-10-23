import {phaseAt, validRhythm, type Rhythm} from './engine.ts';
import {phaseEnvelope} from './audio-envelope.ts';
import type {SoundSet, AudioMode} from './audio-types.ts';
import {phaseRoles} from './audio-types.ts';
import {createSingingBowl} from './bowl-synth.ts';
interface Voice { sources: AudioScheduledSourceNode[]; gain: GainNode; start: number; end: number; levelAt: (time:number)=>number }

export class BowlAudio {
 private context?: AudioContext;
 private master?: GainNode;
 private buffers = new Map<string, AudioBuffer>();
 private voices = new Set<Voice>();
 private timer?: ReturnType<typeof setInterval>;
 private generation = 0;
 private volume = 0.35;
 private silenceUntil = 0;
 private mode: AudioMode = 'synthesized';
 private loadState: 'synthesized'|'fallback'|'recorded'|'partial' = 'synthesized';
 get recordingStatus() { return this.loadState; }
 async unlock() {
  try {
   this.context ??= new AudioContext();
   if(!this.master){this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination)}
   await this.context.resume();
  } catch { /* No audio capability: the exercise continues silently. */ }
 }
 setVolume(volume:number) {
  this.volume=volume;
  if(this.context&&this.master){const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(volume,t,0.02)}
 }
 async prepare(set:SoundSet,mode:AudioMode='synthesized') {
  this.mode=mode;
  this.loadState=mode==='synthesized'?'synthesized':'fallback';
  const c=this.context;if(!c||mode==='synthesized')return;
  await Promise.all([...new Set(Object.values(set.recordings).filter((url):url is string=>Boolean(url)))].map(async url=>{
   if(this.buffers.has(url))return;
   try {const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('Media unavailable');const buffer=await c.decodeAudioData(await response.arrayBuffer());this.buffers.set(url,buffer)}catch{/* Missing/corrupt recordings use fallback for that role. */}
  }));
  const loaded=phaseRoles.filter(role=>{const url=set.recordings[role];return url&&this.buffers.has(url)}).length;
  this.loadState=loaded===4?'recorded':loaded?'partial':'fallback';
 }
 private schedule(set:SoundSet,index:number,at:number,duration:number,offset:number) {
  const c=this.context;if(!c||c.state!=='running'||!this.master)return;
  const delayed=Math.max(at,c.currentTime,this.silenceUntil);offset+=delayed-at;at=delayed;
  const url=set.recordings[phaseRoles[index]];
  const buffer=this.mode==='recorded'&&url?this.buffers.get(url):undefined;
  // A recording that already ended before pause stays silent on resume.
  if(buffer&&offset>=buffer.duration)return;
  const envelope=phaseEnvelope(duration,offset);if(envelope.end<=0)return;
  const gain=c.createGain();gain.connect(this.master);
  let sources: AudioScheduledSourceNode[], partialGains: GainNode[]=[];
  try {
   if(buffer){
    const source=c.createBufferSource();source.buffer=buffer;source.loop=false;source.connect(gain);sources=[source];
   } else {
    const bowl=createSingingBowl(c,gain,set.frequencies[phaseRoles[index]],at,offset);
    sources=bowl.sources;partialGains=bowl.gains;
   }
  } catch {gain.disconnect();return; /* Failed audio leaves the breathing clock untouched. */}
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(envelope.peak,at+envelope.attack);
  gain.gain.setValueAtTime(envelope.peak,at+envelope.fadeStart);
  gain.gain.linearRampToValueAtTime(0,at+envelope.end);
  const voice:Voice={sources,gain,start:at,end:at+envelope.end,levelAt:(time)=>{
   const t=time-at;
   if(t<0||t>=envelope.end)return 0;
   if(t<envelope.attack)return envelope.peak*t/envelope.attack;
   return t<=envelope.fadeStart?envelope.peak:envelope.peak*(envelope.end-t)/(envelope.end-envelope.fadeStart);
  }};
  this.voices.add(voice);
  let active=sources.length;
  sources.forEach(source=>{
   source.onended=()=>{
    source.disconnect();
    if(--active===0){partialGains.forEach(node=>node.disconnect());gain.disconnect();this.voices.delete(voice)}
   };
   if(buffer)(source as AudioBufferSourceNode).start(at,offset);else (source as OscillatorNode).start(at);
   source.stop(at+Math.min(envelope.end,buffer?buffer.duration-offset:envelope.end));
  });
 }
 run(set:SoundSet,rhythm:Rhythm,elapsedMs:number,endMs:number) {
  this.stop();
  const c=this.context;if(!c||c.state!=='running'||!validRhythm(rhythm))return;
  const generation=this.generation;
  // Both the UI and this scheduler measure elapsed time from the same monotonic clock.
  const wallOrigin=performance.now()-elapsedMs;
  const audioOrigin=c.currentTime-elapsedMs/1000;
  let cursor=elapsedMs;
  const pump=()=>{
   if(generation!==this.generation)return;
   const now=performance.now()-wallOrigin;
   if(now>=endMs){if(this.timer)clearInterval(this.timer);this.timer=undefined;return;}
   // Do not replay phases missed during a stalled main thread.
   cursor=Math.max(cursor,now);
   let queued=0;
   while(cursor<endMs&&cursor<=now+250&&queued++<64){
    const phase=phaseAt(cursor+1e-6,rhythm);
    const duration=rhythm[phase.index];
    const next=cursor+1e-6+phase.remaining*1000;
    const offset=Math.max(0,duration-(next-cursor)/1000);
    this.schedule(set,phase.index,audioOrigin+cursor/1000,duration,offset);
    cursor=next;
   }
  };
  this.timer=setInterval(pump,25);pump();
 }
 stop() {
  this.generation++;
  if(this.timer)clearInterval(this.timer);this.timer=undefined;
  const c=this.context;if(!c)return;
  const now=c.currentTime;
  for(const voice of this.voices){
   const level=voice.levelAt(now);
   voice.gain.gain.cancelScheduledValues(now);
   voice.gain.gain.setValueAtTime(level,now);
   const end=voice.start>now?now:Math.min(voice.end,now+0.05);
   voice.gain.gain.linearRampToValueAtTime(0,end);
   voice.levelAt=time=>time>=end?0:level*Math.max(0,(end-time)/(end-now||1));
   voice.end=end;
   this.silenceUntil=Math.max(this.silenceUntil,end);
   voice.sources.forEach(source=>source.stop(end));
  }
 }
 preview(set:SoundSet){this.stop();this.schedule(set,0,this.context?.currentTime||0,5,0)}
}
