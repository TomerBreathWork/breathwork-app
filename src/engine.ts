export type Rhythm = [number, number, number, number];
export const labels = ['Inhale', 'Hold', 'Exhale', 'Hold'];
export function validRhythm(r: Rhythm) { return r.every(n => Number.isFinite(n) && n >= 0 && n <= 120) && r.some(n => n > 0); }
export function phaseAt(elapsed: number, rhythm: Rhythm) {
  const cycle = rhythm.reduce((a,b) => a+b, 0) * 1000;
  if (!validRhythm(rhythm)) throw new Error('Invalid breathing rhythm');
  const lap = Math.floor(elapsed / cycle);
  const offset = elapsed - lap * cycle;
  let start = 0;
  for (let i = 0; i < 4; i++) {
    const duration = rhythm[i] * 1000;
    if (duration > 0 && offset < start + duration) return { index: i, progress: (offset-start)/duration, remaining: (start+duration-offset)/1000, key: `${lap}-${i}` };
    start += duration;
  }
  throw new Error('Phase not found');
}
export function finishAt(minutes: number, rhythm: Rhythm) {
  const target = minutes * 60000;
  const cycle = rhythm.reduce((a,b) => a+b,0)*1000;
  let end = Math.floor(target/cycle)*cycle;
  if (end === target) return end;
  for (const duration of rhythm) { end += duration*1000; if (end >= target) return end; }
  return end;
}
