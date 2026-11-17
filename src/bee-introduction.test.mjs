import test from 'node:test';
import assert from 'node:assert/strict';
import {beeIntroductionStep} from './bee-introduction.ts';
test('one narrated instruction follows the confirmed cues without returning to three competing images',()=>{
 let shown='inhale';const actual=[];
 for(const cue of ['balanced','inhale','ears','hum','balanced']){shown=beeIntroductionStep(cue,shown);actual.push(shown);}
 assert.deepEqual(actual,['inhale','inhale','ears','hum','hum']);
});
test('a fresh replay opens with inhale, while a paused/final balanced cue retains its current image',()=>{
 assert.equal(beeIntroductionStep('balanced'),'inhale');assert.equal(beeIntroductionStep('balanced','ears'),'ears');assert.equal(beeIntroductionStep('balanced','hum'),'hum');
});
