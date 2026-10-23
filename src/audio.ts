export class BowlAudio {
 private context?: AudioContext;
 private voices: GainNode[] = [];
 async unlock() { try { this.context ??= new AudioContext(); await this.context.resume(); } catch { /* Silent fallback. */ } }
 stop() { const c=this.context; if(!c)return; this.voices.forEach(g=>{g.gain.cancelScheduledValues(c.currentTime);g.gain.setTargetAtTime(0,c.currentTime,0.035)});this.voices=[]; }
 play(frequency:number, volume:number) {
  const c=this.context;if(!c || c.state!=='running')return;this.stop();
  const gain=c.createGain();gain.connect(c.destination);const t=c.currentTime;
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume*0.22,t+0.025);gain.gain.exponentialRampToValueAtTime(0.0001,t+2.5);this.voices.push(gain);
  [1,2.01,3.98].forEach((ratio,i)=>{const o=c.createOscillator();const g=c.createGain();o.frequency.value=frequency*ratio;g.gain.value=1/(i+1)**2;o.connect(g);g.connect(gain);o.start(t);o.stop(t+2.6);o.onended=()=>{o.disconnect();g.disconnect()}});
 }
}
