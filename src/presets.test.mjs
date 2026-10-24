import test from 'node:test';
import assert from 'node:assert/strict';
import {presets,restorePreset,editRhythm,selectPreset,selectCustom} from './presets.ts';
const base={preset:'coherentBreathing',rhythm:[5.5,0,5.5,0],minutes:7,volume:.25,sound:'silent',background:'photo-2'};
test('the three built-in configurations retain exact durations and stable saved IDs',()=>{
 assert.deepEqual(presets,[{key:'coherentBreathing',rhythm:[5.5,0,5.5,0]},{key:'boxBreathing',rhythm:[4,4,4,4]},{key:'eveningUnwind',rhythm:[4,7,8,0]}]);
 for(const preset of presets){assert.equal(restorePreset(preset.key,preset.rhythm),preset.key);assert.equal(restorePreset(undefined,preset.rhythm),preset.key)}
});
test('retired and unknown preset IDs preserve their configurations as Custom',()=>{
 assert.equal(restorePreset('slowSteady',[4,0,6,0]),'custom');
 assert.equal(restorePreset('removed-preset',[5.5,0,5.5,0]),'custom');
 assert.equal(restorePreset(undefined,[3.5,1,7,.5]),'custom');
 assert.equal(restorePreset('custom',[4,4,4,4]),'custom');
 assert.equal(restorePreset('boxBreathing',[4,4,5,4]),'custom');
});
test('manual editing only leaves the selected preset when its actual rhythm changes',()=>{
 assert.equal(editRhythm(base,[5.5,0,5.5,0]).preset,'coherentBreathing');
 const custom=editRhythm(base,[6.5,0,5.5,0]);
 assert.equal(custom.preset,'custom');assert.deepEqual(custom.customRhythm,[6.5,0,5.5,0]);
 assert.deepEqual(base.rhythm,[5.5,0,5.5,0]);
 const incomplete=editRhythm(custom,[NaN,0,5.5,0]);
 assert.deepEqual(incomplete.customRhythm,custom.customRhythm);
});
test('Custom survives multiple preset switches and serialized settings without changing other preferences',()=>{
 const custom=editRhythm(base,[6.5,1.5,8.5,.5]);
 const box=selectPreset(selectPreset(custom,'coherentBreathing'),'boxBreathing');
 const restored=selectCustom(JSON.parse(JSON.stringify(box)));
 assert.equal(restored.preset,'custom');assert.deepEqual(restored.rhythm,[6.5,1.5,8.5,.5]);
 for(const key of ['minutes','volume','sound','background'])assert.equal(restored[key],base[key]);
 assert.notEqual(restored.rhythm,custom.rhythm);
 assert.deepEqual(selectPreset(restored,'eveningUnwind').rhythm,[4,7,8,0]);
});
