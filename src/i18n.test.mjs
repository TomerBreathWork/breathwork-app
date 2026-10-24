import {test} from 'node:test';
import assert from 'node:assert/strict';
import en from './locales/en.json' with {type:'json'};
import he from './locales/he.json' with {type:'json'};
import ja from './locales/ja.json' with {type:'json'};
test('all three languages cover every UI key and preserve named placeholders',()=>{
 for(const dictionary of [he,ja]){
  assert.deepEqual(Object.keys(dictionary).sort(),Object.keys(en).sort());
  for(const key of Object.keys(en)){
   assert.equal(typeof dictionary[key],'string');assert(dictionary[key].trim());
   assert.deepEqual([...dictionary[key].matchAll(/\{\w+\}/g)].map(match=>match[0]).sort(),[...en[key].matchAll(/\{\w+\}/g)].map(match=>match[0]).sort());
  }
 }
});
