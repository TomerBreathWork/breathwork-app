/*!
MIT License

Copyright (c) 2026 Olivier Giulieri

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/** Faithful struck-bowl adaptation of Olivier Giulieri's bowls.js (MIT).
 * Differences: exact tuning (no random pitch drift), resume seeking without a
 * second strike, and all effects routed through the caller's phase gate.
 */
export const bowlPartials = [
 {ratio:1, amp:1, beat:0.55, tau:3.4},
 {ratio:2.71, amp:0.5, beat:1.3, tau:1.9},
 {ratio:5.15, amp:0.26, beat:2.4, tau:1.1},
 {ratio:8.3, amp:0.11, beat:3.7, tau:0.6},
] as const;
export const referenceMix = {reverb:0.35, threshold:-16, ratio:6, attack:0.004, impulseSeconds:3.6, impulseDecay:2.6};
const impulses = new WeakMap<BaseAudioContext,AudioBuffer>();
// Keep the existing slider/prefs: its original 35% default maps to the reference's
// 70% default. Zero and maximum still map to zero and unity, before compression.
export function referenceVolumeGain(volume:number) {return Math.pow(volume,1.6*Math.log(0.7)/Math.log(0.35))}
export interface BowlNodes {
 sources: AudioScheduledSourceNode[];
 gains: GainNode[];
 nodes: AudioNode[];
 offsets: Map<AudioScheduledSourceNode,number>;
 volume: GainNode;
 lifetimes: Map<AudioScheduledSourceNode,number>;
}
export function prepareBowlImpulse(context:BaseAudioContext,random:()=>number=Math.random):AudioBuffer {
  let impulse=impulses.get(context);
  if(!impulse){
   const len=Math.floor(context.sampleRate*referenceMix.impulseSeconds);
   impulse=context.createBuffer(2,len,context.sampleRate);
   for(let ch=0;ch<2;ch++){
    const data=impulse.getChannelData(ch);let lp=0;
    for(let i=0;i<len;i++){lp+=0.35*(random()*2-1-lp);data[i]=lp*Math.pow(1-i/len,referenceMix.impulseDecay)*1.6}
   }
   impulses.set(context,impulse);
  }
  return impulse;
}
export function createSingingBowl(context: BaseAudioContext, destination: AudioNode, frequency: number, at: number, offset: number, options: {volume?:number;random?:()=>number;impulse?:AudioBuffer} = {}): BowlNodes {
 const random=options.random||Math.random;
 const sources: AudioScheduledSourceNode[]=[],gains:GainNode[]=[],nodes:AudioNode[]=[],offsets=new Map<AudioScheduledSourceNode,number>(),lifetimes=new Map<AudioScheduledSourceNode,number>();
 const gain=(value=1)=>{const g=context.createGain();g.gain.value=value;gains.push(g);nodes.push(g);return g};
 try {
  const impulse=options.impulse||prepareBowlImpulse(context,random);
  const bus=gain(),dry=gain(1-0.45*referenceMix.reverb),wet=gain(referenceMix.reverb*1.1);
  const convolver=context.createConvolver();nodes.push(convolver);convolver.buffer=impulse;
  const volume=gain(referenceVolumeGain(options.volume??0.35));
  const compressor=context.createDynamicsCompressor();nodes.push(compressor);
  compressor.threshold.value=referenceMix.threshold;compressor.ratio.value=referenceMix.ratio;
  bus.connect(dry);dry.connect(volume);bus.connect(convolver);convolver.connect(wet);wet.connect(volume);
  volume.connect(compressor);compressor.connect(destination);
  const out=gain(0.2);out.connect(bus);
  for(const partial of bowlPartials){
   const pg=gain(partial.amp),env=gain();pg.connect(env);env.connect(out);
   if(offset<referenceMix.attack){
    env.gain.setValueAtTime(offset/referenceMix.attack,at);
    env.gain.linearRampToValueAtTime(1,at+referenceMix.attack-offset);
    env.gain.setTargetAtTime(0,at+referenceMix.attack-offset,partial.tau);
   } else {
    env.gain.setValueAtTime(Math.exp(-(offset-referenceMix.attack)/partial.tau),at);
    env.gain.setTargetAtTime(0,at,partial.tau);
   }
   // Original equal-strength detuned pairs; retain its beat jitter but not pitch drift.
   for(const d of [0,partial.beat*(0.8+random()*0.4)]){
    const oscillator=context.createOscillator();sources.push(oscillator);
    const f=frequency*partial.ratio+d;oscillator.type='sine';oscillator.frequency.value=f;
    if(offset>0){const phase=(2*Math.PI*f*offset)%(2*Math.PI);oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array([0,Math.sin(phase)]),new Float32Array([0,Math.cos(phase)]),{disableNormalization:true}))}
    oscillator.connect(pg);lifetimes.set(oscillator,Math.max(0,3.4*7+0.5-offset));
   }
  }
  // Original clink(): 30 ms cubic-decay noise, 2600 Hz bandpass/Q 0.8, gain 0.10.
  // Only at the phase strike, never on resume/unmute after the transient ended.
  if(offset<0.03){
   const len=Math.floor(context.sampleRate*0.03),buffer=context.createBuffer(1,len,context.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<len;i++)data[i]=(random()*2-1)*Math.pow(1-i/len,3);
   const source=context.createBufferSource();source.buffer=buffer;source.loop=false;sources.push(source);offsets.set(source,offset);
   const bp=context.createBiquadFilter();nodes.push(bp);bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=0.8;
   const clinkGain=gain(0.10);source.connect(bp);bp.connect(clinkGain);clinkGain.connect(bus);
  }
  // Match upstream's 24.3 s oscillator lifetime, retaining only its reverb tail.
  // A zero-valued native source disposes the effect graph on the audio clock,
  // even if the main thread is stalled. It produces no sound.
  const lifetime=context.createConstantSource();lifetime.offset.value=0;lifetime.connect(destination);
  sources.push(lifetime);lifetimes.set(lifetime,Math.max(0,3.4*7+0.5+referenceMix.impulseSeconds-offset));
  return {sources,gains,nodes,offsets,volume,lifetimes};
 } catch(error){sources.forEach(node=>node.disconnect());nodes.forEach(node=>node.disconnect());throw error}
}
