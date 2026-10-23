import {phaseAt, validRhythm, type Rhythm} from './engine.ts';
import {phaseEnvelope} from './audio-envelope.ts';
import type {PhaseRole, SoundSet} from './audio-types.ts';
import {phaseRoles} from './audio-types.ts';
interface Voice { source: AudioBufferSourceNode; gain: GainNode; start: number; end: number; levelAt: (time:number)=>number }

export class BowlAudio {
 private context?: AudioContext;
 private master?: GainNode;
 private buffers = new Map<string, AudioBuffer>();
 private voices = new Set<Voice>();
 private timer?: ReturnType<typeof setInterval>;
 private generation = 0;
 private volume = 0.35;
 private silenceUntil = 0;
 private loadState: 'fallback'|'recorded'|'partial' = 'fallback';
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
 async prepare(set:SoundSet) {
  const c=this.context;if(!c)return;
  await Promise.all([...new Set(Object.values(set.recordings).filter((url):url is string=>Boolean(url)))].map(async url=>{
   if(this.buffers.has(url))return;
   try {const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('Media unavailable');const buffer=await c.decodeAudioData(await response.arrayBuffer());this.buffers.set(url,buffer)}catch{/* Missing/corrupt recordings use fallback for that role. */}
  }));
  const loaded=phaseRoles.filter(role=>{const url=set.recordings[role];return url&&this.buffers.has(url)}).length;
  this.loadState=loaded===4?'recorded':loaded?'partial':'fallback';
  // Prepare fallback buffers before the session clock starts, never on a phase boundary.
  phaseRoles.forEach(role=>this.bufferFor(set,role));
 }
 private bufferFor(set:SoundSet,role:PhaseRole):AudioBuffer {
  const url=set.recordings[role];const recording=url&&this.buffers.get(url);if(recording)return recording;
  const key=`synth:${set.frequencies[role]}`;
  let buffer=this.buffers.get(key);if(buffer)return buffer;
  const c=this.context!;buffer=c.createBuffer(1,Math.ceil(c.sampleRate*4),c.sampleRate);
  const data=buffer.getChannelData(0),frequency=set.frequencies[role];
  for(let i=0;i<data.length;i++){const t=i/c.sampleRate;data[i]=0.2*Math.exp(-t*1.5)*(Math.sin(2*Math.PI*frequency*t)+0.18*Math.sin(2*Math.PI*frequency*2.01*t)+0.06*Math.sin(2*Math.PI*frequency*3.98*t))}
  this.buffers.set(key,buffer);return buffer;
 }
 private schedule(set:SoundSet,index:number,at:number,duration:number,offset:number) {
  const c=this.context;if(!c||c.state!=='running'||!this.master)return;
  const delayed=Math.max(at,c.currentTime,this.silenceUntil);offset+=delayed-at;at=delayed;
  const buffer=this.bufferFor(set,phaseRoles[index]);
  // A recording that already ended before pause stays silent on resume.
  if(offset>=buffer.duration)return;
  const envelope=phaseEnvelope(duration,offset);if(envelope.end<=0)return;
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=false;
  source.connect(gain);gain.connect(this.master);
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(envelope.peak,at+envelope.attack);
  gain.gain.setValueAtTime(envelope.peak,at+envelope.fadeStart);
  gain.gain.linearRampToValueAtTime(0,at+envelope.end);
  const voice:Voice={source,gain,start:at,end:at+envelope.end,levelAt:(time)=>{
   const t=time-at;
   if(t<0||t>=envelope.end)return 0;
   if(t<envelope.attack)return envelope.peak*t/envelope.attack;
   return t<=envelope.fadeStart?envelope.peak:envelope.peak*(envelope.end-t)/(envelope.end-envelope.fadeStart);
  }};
  this.voices.add(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice)};
  source.start(at,offset);
  source.stop(at+Math.min(envelope.end,buffer.duration-offset));
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
   voice.source.stop(end);
  }
 }
 preview(set:SoundSet){this.stop();this.schedule(set,0,this.context?.currentTime||0,5,0)}
}
