import test from 'node:test';
import assert from 'node:assert/strict';
import {sliderPositionToHoldDuration as fromPosition,holdDurationToSliderPosition as toPosition,nextHoldDuration,phaseLimits,clampPhaseDuration,migrateRhythm,validConfiguredRhythm} from './duration-controls.ts';

test('hold endpoints and the 70-percent precision boundary are exact and continuous',()=>{
 for(const [p,seconds] of [[0,0],[70,30],[80,60],[90,90],[100,120]]){
  assert.equal(fromPosition(p),seconds);assert.equal(toPosition(seconds),p);
 }
 for(const p of [70-1e-8,70,70+1e-8])assert.equal(fromPosition(p),30);
 assert.equal(fromPosition(-1),0);assert.equal(fromPosition(101),120);
});
test('all half-second short holds and coarse long stops round-trip and remain monotonic',()=>{
 const durations=[...Array.from({length:61},(_,i)=>i*.5),...Array.from({length:15},(_,i)=>32+i*2),...Array.from({length:6},(_,i)=>65+i*5),100,110,120];
 for(const duration of durations)assert.equal(fromPosition(toPosition(duration)),duration);
 let previous=0;
 for(let p=0;p<=100;p+=.01){const value=fromPosition(p);assert(value>=previous);assert(durations.includes(value));previous=value}
 for(const [value,next,previous] of [[0,.5,0],[29.5,30,29],[30,32,29.5],[60,65,58],[90,100,85],[120,120,110],[31.5,32,30]]){
  assert.equal(nextHoldDuration(value,1),next);assert.equal(nextHoldDuration(value,-1),previous);
 }
});
test('manual exact holds have unsnapped thumb positions, without mutating the supplied duration',()=>{
 for(const value of [.5,5.5,31,31.5,47,62.5,91.5,119.5]){
  const position=toPosition(value);
  const decoded=position<=70?position/70*30:30+(position-70)*3;
  assert(Math.abs(decoded-value)<1e-10);
 }
});
test('inhale/exhale bounds and saved current/custom rhythms migrate without integer rounding',()=>{
 assert.deepEqual(phaseLimits(0),{min:.5,max:40});assert.deepEqual(phaseLimits(2),{min:.5,max:40});
 assert.deepEqual(phaseLimits(1),{min:0,max:120});
 assert.equal(clampPhaseDuration(0,100),40);assert.equal(clampPhaseDuration(2,0),.5);assert.equal(clampPhaseDuration(1,47.5),47.5);
 assert.deepEqual(migrateRhythm([120,31.5,85,119.5]),[40,31.5,40,119.5]);
 assert.deepEqual(migrateRhythm([0,2,0,0]),[.5,2,.5,0]);
 assert.deepEqual(migrateRhythm([5.5,0,5.5,0]),[5.5,0,5.5,0]);
 for(const value of [null,{},[0,0,0,0],[NaN,0,4,0],[4,0,6]])assert.equal(migrateRhythm(value),undefined);
 assert.equal(validConfiguredRhythm([5.5,0,5.5,0]),true);
 for(const rhythm of [[0,0,6,0],[4,0,41,0],[4,121,4,0]])assert.equal(validConfiguredRhythm(rhythm),false);
});
