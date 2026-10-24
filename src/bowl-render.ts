import {createSingingBowl,prepareBowlImpulse} from './bowl-synth.ts';
export const bowlDuration = 3.4*7+0.5+3.6;

/** Render the reference's uncompressed dry/reverb mix before the session clock.
 * Volume and the original compressor stay live, after this buffer and before
 * the phase gate. This is a rendering of the actual model, not sampled third-
 * party media or a replacement synthesis algorithm. One stereo buffer per note
 * is cached by BowlAudio; both C4 roles share the same signal.
 */
export async function renderBowl(context: BaseAudioContext,frequency:number,options:{random?:()=>number}={}):Promise<AudioBuffer> {
 const impulse=prepareBowlImpulse(context,options.random);
 const offline=new OfflineAudioContext(2,Math.ceil(context.sampleRate*bowlDuration),context.sampleRate);
 const bowl=createSingingBowl(offline,offline.destination,frequency,0,0,{impulse,random:options.random});
 // Tap the linear mix before its volume/compressor. These stay live at playback.
 bowl.volume.disconnect();bowl.volume.gain.value=1;bowl.volume.connect(offline.destination);
 try {
  for(const source of bowl.sources){
   if(bowl.offsets.has(source))(source as AudioBufferSourceNode).start(0,bowl.offsets.get(source));
   else (source as OscillatorNode).start(0);
   source.stop(Math.min(bowlDuration,bowl.lifetimes.get(source)??bowlDuration));
  }
  return await offline.startRendering();
 } finally {bowl.sources.forEach(source=>source.disconnect());bowl.nodes.forEach(node=>node.disconnect())}
}
