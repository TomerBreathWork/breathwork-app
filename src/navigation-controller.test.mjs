import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavigationController } from './navigation-controller.ts';
import { navigationKey, readNavigationSnapshot } from './navigation.ts';
import { saveUpdateConfiguration, consumeUpdateConfiguration } from './launch-configuration.ts';
const draft = { preset:'coherentBreathing', practiceId:'coherent', rhythm:[5.5,0,5.5,0], minutes:3 };
function fixture(restored) {
  const stack=[{foreign:'kept'}], listeners=new Map(), tasks=new Map();let position=0,serial=0;
  const host={
    history:{get state(){return stack[position];},replaceState(s){stack[position]=s;},pushState(s){stack.splice(position+1);stack.push(s);position++;},go(delta){tasks.set(++serial,()=>{const next=position+delta;if(next<0||next>=stack.length)return;position=next;for(const fn of listeners.get('popstate')??[])fn(new Event('popstate'));});}},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    queueMicrotask(fn){tasks.set(++serial,fn);},
  };
  let pauses=0,stops=0;const restoredViews=[];
  const controller=new NavigationController(host,{pause(){pauses++;controller.updateSession('paused');},stop(){stops++;controller.updateSession('idle');},restore(view,draft){restoredViews.push({view,draft});}},restored);
  controller.start();
  const flush=()=>{let turns=0;while(tasks.size){if(++turns>100)throw new Error('history loop');const [key,fn]=tasks.entries().next().value;tasks.delete(key);fn();}};
  const pop=delta=>{host.history.go(delta);flush();};
  const select=()=>{controller.open({name:'home',mode:'selected'},draft);controller.remember(draft);};
  return {controller,host,stack,flush,pop,select,listeners,restoredViews,get pauses(){return pauses;},get stops(){return stops;},get position(){return position;}};
}
test('one root entry, foreign state retained, StrictMode remount and warm resume do not reset navigation',()=>{
 const f=fixture();assert.equal(f.stack.length,1);assert.equal(f.host.history.state.foreign,'kept');
 f.select();f.controller.dispose();f.controller.start();assert.equal(f.stack.length,2);assert.equal(f.controller.getSnapshot().screen.mode,'selected');
 f.pop(-1);assert.equal(f.controller.getSnapshot().screen.mode,'choosing');f.pop(1);assert.equal(f.controller.getSnapshot().screen.mode,'selected');
});
test('selected Home Back and Change Practice retain Forward without duplicate entries',()=>{
 const f=fixture();f.select();f.controller.chooseHome();f.flush();assert.equal(f.position,0);assert.equal(f.stack.length,2);f.pop(1);assert.equal(f.controller.getSnapshot().screen.mode,'selected');
 f.controller.open({name:'library'});f.controller.open({name:'details',id:'box'},{...draft,preset:'boxBreathing',practiceId:'box',rhythm:[6.5,6.5,6.5,6.5]});
 f.pop(-1);assert.equal(f.controller.getSnapshot().screen.name,'library');f.pop(1);assert.equal(f.restoredViews.at(-1).draft.rhythm[0],6.5);
});
test('Back from running practice pauses once, restores its history position and Stay never resumes it',()=>{
 const f=fixture();f.select();f.controller.beginSession(draft);f.pop(-1);
 assert.deepEqual(f.controller.getSnapshot(),{screen:f.host.history.state[navigationKey].view,exitPending:true,settling:false});
 assert.equal(f.pauses,1);assert.equal(f.stops,0);assert.equal(f.position,2);
 f.controller.stay();assert.equal(f.controller.getSnapshot().exitPending,false);assert.equal(f.position,2);
 f.pop(-1);assert.equal(f.pauses,1);assert.equal(f.controller.getSnapshot().exitPending,true);
});
test('rapid Back and multi-entry traversal preserve the history branch and stop only on confirmation',()=>{
 const f=fixture();f.select();f.controller.open({name:'library'});f.controller.open({name:'details',id:'coherent'},draft);f.controller.beginSession(draft);
 f.host.history.go(-1);f.host.history.go(-2);f.flush();
 assert.equal(f.position,4);assert.equal(f.stack.length,5);assert.equal(f.pauses,1);assert.equal(f.stops,0);
 f.controller.end();f.controller.end();f.flush();assert.equal(f.stops,1);assert.equal(f.controller.getSnapshot().exitPending,false);assert.ok(f.position<4);
 f.pop(4-f.position);assert.notEqual(f.controller.getSnapshot().screen.name,'session');assert.equal(f.stops,1);
});
test('explicit Stop/completion do not resurrect a session through Forward, and restart creates no extra entry',()=>{
 const f=fixture();f.select();f.controller.beginSession(draft);const count=f.stack.length;
 f.controller.beginSession(draft);assert.equal(f.stack.length,count);
 f.controller.updateSession('completed');f.pop(-1);assert.equal(f.stops,1);assert.equal(f.controller.getSnapshot().exitPending,false);
 f.pop(1);assert.equal(f.controller.getSnapshot().screen.name,'home');assert.equal(f.controller.getSnapshot().screen.mode,'selected');
 f.pop(-1);assert.equal(f.controller.getSnapshot().screen.mode,'choosing');
});
test('beforeunload is limited to active sessions, and root does not create a history trap',()=>{
 const f=fixture();assert.equal(f.listeners.get('beforeunload')?.size??0,0);f.select();f.controller.beginSession(draft);
 assert.equal(f.listeners.get('beforeunload').size,1);f.controller.end();f.flush();assert.equal(f.listeners.get('beforeunload').size,0);
 f.pop(-1);f.pop(-1);assert.equal(f.position,0);assert.equal(f.stack.length,3);
});
test('safe update snapshot preserves navigation and drafts; manual initialization always starts at chooser',()=>{
 const f=fixture();f.select();f.controller.open({name:'library'});f.controller.open({name:'details',id:'box'},{...draft,practiceId:'box',preset:'boxBreathing',rhythm:[5,5,5,5]});
 const snapshot=f.controller.snapshotForUpdate();assert.ok(readNavigationSnapshot(snapshot));
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 saveUpdateConfiguration(storage,{...draft,navigation:snapshot},1000);
 const handoff=consumeUpdateConfiguration(storage,true,1001);const restored=fixture(handoff.navigation);
 assert.equal(restored.controller.getSnapshot().screen.id,'box');assert.equal(restored.host.history.state[navigationKey].draft.rhythm[0],5);
 assert.equal(fixture().controller.getSnapshot().screen.mode,'choosing');
 f.controller.beginSession(draft);assert.equal(f.controller.snapshotForUpdate(),undefined);
});

test('manual reload resets to chooser without discarding existing browser-history indices',()=>{
 const f=fixture();f.select();f.controller.beginSession(draft);f.controller.dispose();
 const c=new NavigationController(f.host,{pause(){},stop(){},restore(){}});c.start();
 assert.equal(c.getSnapshot().screen.mode,'choosing');assert.equal(f.host.history.state[navigationKey].index,2);
 f.pop(-1);assert.equal(c.getSnapshot().screen.mode,'selected');f.pop(1);assert.equal(c.getSnapshot().screen.mode,'choosing');
});

test('confirmed End is idempotent even if a stale handler fires after history has settled',()=>{
 const f=fixture();f.select();f.controller.beginSession(draft);f.pop(-1);
 f.controller.end();f.flush();assert.equal(f.stops,1);
 const position=f.position;f.controller.end();f.flush();
 assert.equal(f.stops,1);assert.equal(f.position,position);
});
