import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, finishAt, validRhythm } from './engine.ts';
test('zero holds are skipped, including at cycle boundary',()=>{
 assert.equal(phaseAt(0,[4,0,6,0]).index,0);
 assert.equal(phaseAt(4000,[4,0,6,0]).index,2);
 assert.equal(phaseAt(10000,[4,0,6,0]).index,0);
 assert.equal(phaseAt(0,[0,2,0,0]).index,1);
});
test('water and hold progress follow elapsed time',()=>{
 assert.equal(phaseAt(2000,[4,4,4,4]).progress,.5);
 assert.equal(phaseAt(6000,[4,4,4,4]).progress,.5);
 assert.equal(phaseAt(14000,[4,4,4,4]).index,3);
});
test('completion finishes current phase, without adding a phase at exact boundary',()=>{
 assert.equal(finishAt(1,[4,7,8,0]),61000);
 assert.equal(finishAt(1,[4,0,6,0]),60000);
 assert.equal(finishAt(1,[0,0,0,17]),68000);
});
test('invalid rhythms rejected',()=>{
 for(const r of [[0,0,0,0],[-1,0,2,0],[NaN,0,2,0],[Infinity,0,2,0],[121,0,0,0]]) assert.equal(validRhythm(r),false);
 assert.throws(()=>phaseAt(1,[0,0,0,0]));
});
