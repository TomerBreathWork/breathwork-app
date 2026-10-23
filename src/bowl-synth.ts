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
/**
 * Soft modal bowl synthesis, adapted from the paired-partial approach in
 * evoluteur/tibetan-singing-bowls (MIT, Olivier Giulieri, 2026).
 * See third-party/tibetan-singing-bowls-LICENSE.txt and THIRD_PARTY_NOTICES.md.
 * No mallet noise, random pitch drift, compressor, delay, or reverb tail.
 */
export const bowlPartials = [
 {ratio:1, amplitude:0.74, beat:0.45, decay:7, floor:0.16},
 {ratio:2.71, amplitude:0.18, beat:0.8, decay:3.8, floor:0.08},
 {ratio:5.15, amplitude:0.055, beat:1.3, decay:2, floor:0.03},
 {ratio:8.3, amplitude:0.015, beat:1.9, decay:1.2, floor:0.01},
] as const;

export interface BowlNodes { sources: OscillatorNode[]; gains: GainNode[] }
export function createSingingBowl(context: BaseAudioContext, destination: AudioNode, frequency: number, at: number, offset: number): BowlNodes {
 const sources: OscillatorNode[] = [], gains: GainNode[] = [];
 // A small low-note correction keeps G3/C4/E4 close in perceived level.
 // Sum of partial peaks stays below 0.3 before the independent master volume.
 const level=0.28*Math.pow(261.63/frequency,0.12);
 try {
  for(const partial of bowlPartials){
   const envelope=context.createGain();gains.push(envelope);
   const peak=level*partial.amplitude;
   const floor=peak*partial.floor;
   const resumed=floor+(peak-floor)*Math.exp(-offset/partial.decay);
   envelope.gain.setValueAtTime(resumed,at);
   envelope.gain.setTargetAtTime(floor,at,partial.decay);
   envelope.connect(destination);
   // The dominant oscillator is tuned exactly to the requested partial;
   // its quieter companion adds subtle natural beating, not a loud tremolo.
   for(const [detune,weight] of [[0,0.8],[partial.beat,0.2]]){
    const oscillator=context.createOscillator(),balance=context.createGain();
    sources.push(oscillator);gains.push(balance);
    oscillator.type='sine';oscillator.frequency.value=frequency*partial.ratio+detune;
    if(offset>0){
     // Seek oscillator phase too: resume continues the existing beating pattern,
     // rather than resetting the pair to the loudest point of a fresh strike.
     const phase=(2*Math.PI*(frequency*partial.ratio+detune)*offset)%(2*Math.PI);
     oscillator.setPeriodicWave(context.createPeriodicWave(
      new Float32Array([0,Math.sin(phase)]),new Float32Array([0,Math.cos(phase)]),
      {disableNormalization:true},
     ));
    }
    balance.gain.value=weight;
    oscillator.connect(balance);balance.connect(envelope);
   }
  }
  return {sources,gains};
 } catch(error){
  sources.forEach(node=>node.disconnect());gains.forEach(node=>node.disconnect());
  throw error;
 }
}
