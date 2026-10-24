import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseCountdown} from './countdown.ts';
import {phaseAt} from './engine.ts';

const cases = [
 [0.5, [[0,0.5]]],
 [3, [[0,3],[1000,2],[2000,1]]],
 [3.5, [[0,3.5],[500,3],[1500,2],[2500,1]]],
 [4, [[0,4],[1000,3],[2000,2],[3000,1]]],
 [5.5, [[0,5.5],[500,5],[1500,4],[2500,3],[3500,2],[4500,1]]],
 [10.5, [[0,10.5],[500,10],[1500,9],[2500,8],[3500,7],[4500,6],[5500,5],[6500,4],[7500,3],[8500,2],[9500,1]]],
];
for(const [duration,timeline] of cases){
 test(`${duration}s countdown holds its initial fraction, then stable whole numbers until the exact phase boundary`,()=>{
  const rhythm=[duration,0,2,0];
  for(let i=0;i<timeline.length;i++){
   const [start,value]=timeline[i],end=timeline[i+1]?.[0]??duration*1000;
   // Every millisecond and either side of each boundary, using the real engine.
   for(const elapsed of [start,start+.001,...Array.from({length:end-start},(_,i)=>start+i),end-.001]){
    const phase=phaseAt(elapsed,rhythm);
    assert.equal(phase.index,0);
    assert.equal(phaseCountdown(phase.remaining,duration),value,`${elapsed}ms`);
   }
  }
  const next=phaseAt(duration*1000,rhythm);
  assert.equal(next.index,2); // No holds and no zero countdown between phases.
  assert.equal(next.remaining,2);
  assert.equal(phaseCountdown(next.remaining,rhythm[next.index]),2);
  assert.deepEqual(rhythm,[duration,0,2,0]);
 });
}
