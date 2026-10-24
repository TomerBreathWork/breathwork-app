import {phaseAt, validRhythm, type Rhythm} from './engine.ts';
import {phaseEnvelope} from './audio-envelope.ts';
import type {SoundSet, AudioMode} from './audio-types.ts';
import {phaseRoles} from './audio-types.ts';
import {referenceMix,referenceVolumeGain} from './bowl-synth.ts';
import {renderBowl} from './bowl-render.ts';
interface Voice { sources: AudioScheduledSourceNode[]; gain: GainNode; start: number; end: number; levelAt: (time:number)=>number; volume?:GainNode; synthesized:boolean }

export class BowlAudio {
 private context?: AudioContext;
 private render: typeof renderBowl;
 private synthesized = new Map<number,AudioBuffer>();
 private rendering = new Map<number,Promise<AudioBuffer>>();
 constructor(render: typeof renderBowl=renderBowl){this.render=render}
 private async prepareSynthesis(set:SoundSet){
  const c=this.context;if(!c)return;
  for(const frequency of new Set(Object.values(set.frequencies))){
   if(this.synthesized.has(frequency))continue;
   let pending=this.rendering.get(frequency);
   if(!pending){pending=this.render(c,frequency);this.rendering.set(frequency,pending)}
   try{this.synthesized.set(frequency,await pending)}finally{this.rendering.delete(frequency)}
  }
 }
 private master?: GainNode;
 private buffers = new Map<string, AudioBuffer>();
 private voices = new Set<Voice>();
 private timer?: ReturnType<typeof setInterval>;
 private generation = 0;
 private volume = 0.35;
 private silenceUntil = 0;
 private mode: AudioMode = 'synthesized';
 private initialRun = true;
 private loadState: 'synthesized'|'fallback'|'recorded'|'partial' = 'synthesized';
 get recordingStatus() { return this.loadState; }
 async unlock() {
  try {
   this.context ??= new AudioContext();
   if(!this.master){this.master=this.context.createGain();this.master.gain.value=1;this.master.connect(this.context.destination)}
   await this.context.resume();
  } catch { /* No audio capability: the exercise continues silently. */ }
 }
 setVolume(volume:number) {
  this.volume=volume;
  if(this.context)for(const voice of this.voices)voice.volume?.gain.setTargetAtTime(voice.synthesized?referenceVolumeGain(volume):volume,this.context.currentTime,0.05);
 }
 async prepare(set:SoundSet,mode:AudioMode='synthesized') {
  this.mode=mode;
  this.initialRun=true;
  this.setVolume(this.volume);
  this.loadState=mode==='synthesized'?'synthesized':'fallback';
  const c=this.context;if(!c)return;
  if(mode==='synthesized'){try{await this.prepareSynthesis(set)}catch{/* Rendering unavailable: try existing recordings instead. */this.mode='recorded';this.loadState='fallback'}if(this.mode==='synthesized')return;}
  await Promise.all([...new Set(Object.values(set.recordings).filter((url):url is string=>Boolean(url)))].map(async url=>{
   if(this.buffers.has(url))return;
   try {const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('Media unavailable');const buffer=await c.decodeAudioData(await response.arrayBuffer());this.buffers.set(url,buffer)}catch{/* Missing/corrupt recordings use fallback for that role. */}
  }));
  const loaded=phaseRoles.filter(role=>{const url=set.recordings[role];return url&&this.buffers.has(url)}).length;
  this.loadState=loaded===4?'recorded':loaded?'partial':'fallback';
  if(loaded<4)try{await this.prepareSynthesis(set)}catch{/* No supported audio path: exercise remains silent. */}
 }
 private schedule(set:SoundSet,index:number,requestedAt:number,duration:number,offset:number,fresh=true) {
  const c=this.context;if(!c||c.state!=='running'||!this.master)return;
  const url=set.recordings[phaseRoles[index]];
  const recorded=this.mode==='recorded'&&url?this.buffers.get(url):undefined;
  const buffer=recorded||this.synthesized.get(set.frequencies[phaseRoles[index]]);
  if(!buffer||offset>=buffer.duration)return;
  const phaseEnd=requestedAt+duration-offset;
  const gain=c.createGain();gain.gain.value=0;
  const source=c.createBufferSource();source.buffer=buffer;source.loop=false;
  const volume=c.createGain();volume.gain.value=recorded?this.volume:referenceVolumeGain(this.volume);
  let compressor:DynamicsCompressorNode|undefined,resumeGain:GainNode|undefined;
  if(recorded){source.connect(gain);gain.connect(volume);volume.connect(this.master)}
  else {
   compressor=c.createDynamicsCompressor();compressor.threshold.value=referenceMix.threshold;compressor.ratio.value=referenceMix.ratio;
   if(fresh)source.connect(volume);
   else {resumeGain=c.createGain();resumeGain.gain.value=0;source.connect(resumeGain);resumeGain.connect(volume)}
   volume.connect(compressor);compressor.connect(gain);gain.connect(this.master);
  }
  const cleanup=()=>{source.disconnect();volume.disconnect();compressor?.disconnect();resumeGain?.disconnect();gain.disconnect()};
  // Stamp the start AFTER the small playback graph is ready. Realtime contexts
  // get one render quantum of lead; the end remains the original phase deadline.
  const lead='baseLatency' in c?128/c.sampleRate:0;
  const at=Math.max(requestedAt,c.currentTime+lead,this.silenceUntil);
  const elapsed=Math.max(0,duration-(phaseEnd-at));
  if(at>=phaseEnd){cleanup();return;}
  // Preserve the original full strike for a fresh phase; seek on resume/unmute.
  const seek=!recorded&&fresh?0:elapsed;
  if(seek>=buffer.duration){cleanup();return;}
  const envelope=phaseEnvelope(duration,elapsed,!recorded);
  if(!recorded){envelope.attack=fresh?0:Math.min(0.01,envelope.end*0.25);envelope.fadeStart=Math.max(envelope.attack,envelope.fadeStart)}
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(envelope.peak,at+envelope.attack);
  gain.gain.setValueAtTime(envelope.peak,at+envelope.fadeStart);
  gain.gain.linearRampToValueAtTime(0,phaseEnd);
  if(resumeGain){resumeGain.gain.setValueAtTime(0,at);resumeGain.gain.linearRampToValueAtTime(1,at+Math.min(0.004,envelope.end*0.25))}
  const voice:Voice={sources:[source],gain,volume,synthesized:!recorded,start:at,end:phaseEnd,levelAt:(time)=>{
   const t=time-at;
   if(t<0||time>=phaseEnd)return 0;
   if(t<envelope.attack)return envelope.peak*t/envelope.attack;
   return t<=envelope.fadeStart?envelope.peak:envelope.peak*(phaseEnd-time)/(envelope.end-envelope.fadeStart);
  }};
  this.voices.add(voice);
  source.onended=()=>{cleanup();this.voices.delete(voice)};
  source.start(at,seek);source.stop(Math.min(phaseEnd,at+buffer.duration-seek));
 }

 run(set:SoundSet,rhythm:Rhythm,elapsedMs:number,endMs:number) {
  this.stop();
  const c=this.context;if(!c||c.state!=='running'||!validRhythm(rhythm))return;
  const generation=this.generation;
  // Both the UI and this scheduler measure elapsed time from the same monotonic clock.
  const wallOrigin=performance.now()-elapsedMs;
  const audioOrigin=c.currentTime-elapsedMs/1000;
  let cursor=elapsedMs,first=true;
  const resuming=!this.initialRun;this.initialRun=false;
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
    this.schedule(set,phase.index,audioOrigin+cursor/1000,duration,offset,!resuming||!first);
    first=false;
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
