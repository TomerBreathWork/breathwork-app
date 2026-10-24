import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, finishAt, validRhythm, cycleMilliseconds } from './engine.ts';
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
test('completion finishes the full cycle, without adding time at an exact boundary',()=>{
 assert.equal(finishAt(1,[4,7,8,0]),76000);
 assert.equal(finishAt(1,[4,0,6,0]),60000);
 assert.equal(finishAt(1,[0,0,0,17]),68000);
});
test('invalid rhythms rejected',()=>{
 for(const r of [[0,0,0,0],[-1,0,2,0],[NaN,0,2,0],[Infinity,0,2,0],[121,0,0,0]]) assert.equal(validRhythm(r),false);
 assert.throws(()=>phaseAt(1,[0,0,0,0]));
});

test('minimum session durations round up to complete integer-millisecond cycles',()=>{
 for(const [rhythm, expected] of [[[5.5,0,5.5,0],66000],[[5,5,5,5],60000],[[4,4,4,4],64000],[[4.5,0,6,0],63000]]) {
  assert.equal(finishAt(1,rhythm),expected);
  assert.equal(expected % cycleMilliseconds(rhythm),0);
 }
 assert.equal(finishAt(5,[5.5,0,5.5,0]),308000);
 assert.throws(()=>finishAt(1,[0,0,0,0]));
 for(const minutes of [NaN,Infinity,0,-1])assert.throws(()=>finishAt(minutes,[5.5,0,5.5,0]));
});
test('fractional phases and many cycles retain exact boundaries without accumulated drift',()=>{
 const r=[5.5,1.5,5.5,.5];
 for(const lap of [0,1,10,100,1000,100000]) {
  const origin=lap*13000;
  for(const [offset,index] of [[0,0],[5499.99,0],[5500,1],[6999.99,1],[7000,2],[12500,3],[13000,0]])
   assert.equal(phaseAt(origin+offset,r).index,index);
  assert.equal(phaseAt(origin+2750,r).progress,.5);
 }
 assert.equal(phaseAt(5500,[5.5,0,5.5,0]).index,2);
 assert.equal(phaseAt(11000,[5.5,0,5.5,0]).key,'1-0');
});
