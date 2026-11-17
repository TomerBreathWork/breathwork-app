import type { Rhythm } from './engine.ts';
const integer = (value: unknown, min:number, max:number, fallback:number) => typeof value==='number' && Number.isFinite(value)
  ? Math.max(min,Math.min(max,Math.round(value))) : fallback;
export function beeRhythm(value:unknown):Rhythm {
  const rhythm=Array.isArray(value)?value:[];
  return [integer(rhythm[0],2,6,3),0,integer(rhythm[2],4,12,5),0];
}
/** Exactly one lemniscate per exhale; no independent clock or CSS flight timer. */
export function beeAt(phase:number,progress:number,reducedMotion=false) {
  const p=Math.max(0,Math.min(1,progress));
  if(reducedMotion)return {x:50,y:50,scale:1};
  if(phase!==2)return {x:50,y:50-Math.sin(p*Math.PI)*1.5,scale:1};
  const angle=p*Math.PI*2;
  return {x:50+32*Math.sin(angle),y:50+23*Math.sin(angle*2),scale:1};
}
export const beePath=Array.from({length:161},(_,i)=>{const point=beeAt(2,i/160);return `${i?'L':'M'}${point.x},${point.y}`;}).join(' ')+' Z';
