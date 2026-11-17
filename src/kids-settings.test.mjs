import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeKidsSettings,saveKidsSettings,loadKidsSettings,kidsSessionSettings,kidsSettingsKey} from './kids-settings.ts';
import {getPractice,practices,practicesForFilter,adjustPractice,visibleCategories} from './practices.ts';
import {readDraft,readSetupScreen} from './navigation.ts';
import {restoreSavedConfiguration,saveUpdateConfiguration,consumeUpdateConfiguration} from './launch-configuration.ts';
import {finishAt} from './engine.ts';
const storage=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('Kids is a separate audience; adult groups and defaults remain unchanged',()=>{
 assert.equal(practices.length,5);assert.deepEqual(visibleCategories,['calm','focus']);
 assert.deepEqual(practicesForFilter('kids').map(p=>p.id),['flower-candle','bee-breathing']);
 assert.deepEqual(practicesForFilter('all').map(p=>p.id),[...practices.map(p=>p.id),'flower-candle','bee-breathing']);
 for(const category of ['calm','focus'])assert.ok(practicesForFilter(category).every(p=>p.audience!=='kids'));
 assert.deepEqual(getPractice('box').categories,['focus']);assert.equal(getPractice('flower-candle').defaultMinutes,1);
});
test('all six integer rhythms have zero holds, exact ratios and full-cycle duration',()=>{
 for(const seconds of [1,2,3,4,5,6]) {
  const expected=[seconds,0,2*seconds,0];assert.deepEqual(adjustPractice(getPractice('flower-candle'),seconds),expected);
  assert.deepEqual(normalizeKidsSettings({rhythm:[seconds,99,17,12],minutes:1}),{rhythm:expected,minutes:1});
  assert.equal(finishAt(1,expected),({1:60000,2:60000,3:63000,4:60000,5:60000,6:72000})[seconds]);
 }
});
test('invalid saved values and history drafts cannot introduce fractional times or holds',()=>{
 for(const [input,expected] of [[-2,1],[0,1],[1.5,2],[5.8,6],[12,6],[NaN,2],[Infinity,2],[null,2]]) {
  const profile=normalizeKidsSettings({rhythm:[input,4,3,9],minutes:-1});assert.deepEqual(profile,{rhythm:[expected,0,expected*2,0],minutes:1});
  assert.deepEqual(readDraft({practiceId:'flower-candle',rhythm:[input,4,3,9],minutes:-1}),{preset:'custom',practiceId:'flower-candle',...profile});
 }
 assert.deepEqual(normalizeKidsSettings(null),{rhythm:[2,0,4,0],minutes:1});
 assert.equal(normalizeKidsSettings({minutes:999}).minutes,120);
 assert.equal(normalizeKidsSettings({minutes:2.5}).minutes,3);
});
test('child persistence is independent and restricted storage still permits practice',()=>{
 const memory=storage();const previous=globalThis.localStorage;globalThis.localStorage=memory;
 try {
  memory.setItem('still-settings','adult custom memory');assert.deepEqual(loadKidsSettings(),{rhythm:[2,0,4,0],minutes:1});
  saveKidsSettings({rhythm:[6,8,1,2],minutes:5});assert.deepEqual(loadKidsSettings(),{rhythm:[6,0,12,0],minutes:5});
  assert.equal(memory.getItem('still-settings'),'adult custom memory');assert.ok(memory.getItem(kidsSettingsKey));
  globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.doesNotThrow(()=>saveKidsSettings({rhythm:[2,0,4,0],minutes:1}));assert.equal(loadKidsSettings().minutes,1);
 }finally{globalThis.localStorage=previous;}
});
test('shared preferences can be copied without changing adult configuration or Custom memory',()=>{
 const adult={preset:'boxBreathing',practiceId:'box',rhythm:[6,6,6,6],minutes:7,customRhythm:[5,0,9,0],sound:'silent',volume:.6,background:'photo-2'};
 const before=structuredClone(adult);const child=kidsSessionSettings(adult,{rhythm:[3,4,1,9],minutes:2});
 assert.deepEqual(adult,before);assert.deepEqual(child.rhythm,[3,0,6,0]);assert.equal(child.practiceId,'flower-candle');
 assert.equal(child.volume,.6);assert.equal(child.sound,'silent');assert.deepEqual(restoreSavedConfiguration(child),{});
});
test('safe update handoff keeps adult profile and child navigation draft separate',()=>{
 const adult={preset:'boxBreathing',practiceId:'box',rhythm:[4,4,4,4],minutes:5};
 const draft={preset:'custom',practiceId:'flower-candle',rhythm:[6,0,12,0],minutes:2};
 const current={owner:'test',index:1,view:{name:'details',id:'flower-candle'},draft};
 const navigation={current,entries:[{owner:'test',index:0,view:{name:'library',filter:'kids'}},current]};
 const memory=storage();saveUpdateConfiguration(memory,{...adult,navigation},1000);
 const restored=consumeUpdateConfiguration(memory,true,1001);assert.deepEqual(restored.rhythm,adult.rhythm);
 assert.deepEqual(restored.navigation.current.draft,draft);assert.deepEqual(restored.navigation.entries[0].view,{name:'library',filter:'kids'});
 assert.deepEqual(readSetupScreen({name:'library',filter:'energy'}),{name:'library'});
});
