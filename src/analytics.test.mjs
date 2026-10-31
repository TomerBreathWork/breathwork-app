import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsClient, ANALYTICS_CONSENT_KEY, GA_MEASUREMENT_ID } from './analytics.ts';

class Browser extends EventTarget {
  values = new Map(); cookies = new Map(); scripts = [];
  navigator = { onLine: true }; standalone = false;
  location = { href: 'https://tomerbreathwork.github.io/breathwork-app/?email=private@example.test#message' };
  localStorage = { getItem: key => this.values.get(key) ?? null, setItem: (key, value) => this.values.set(key, value) };
  document = {
    createElement: () => ({}),
    head: { appendChild: script => this.scripts.push(script) },
  };
  matchMedia = () => ({ matches: this.standalone });
  constructor(consent) {
    super(); if (consent) this.values.set(ANALYTICS_CONSENT_KEY, consent);
    Object.defineProperty(this.document, 'cookie', {
      get: () => [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; '),
      set: value => { const [key, val] = value.split(';')[0].split('='); if (value.includes('Max-Age=0')) this.cookies.delete(key); else this.cookies.set(key, val); },
    });
  }
  commands() { return (this.dataLayer ?? []).map(value => Array.from(value)); }
  events(name) { return this.commands().filter(([command, event]) => command === 'event' && (!name || event === name)); }
}
const opened = consent => { const browser = new Browser(consent), client = new AnalyticsClient(browser); client.open('settings', 'en', true); return { browser, client }; };

test('basic consent mode sends no events or Google requests before opt-in or after declining', () => {
  for (const consent of [undefined, 'denied', 'invalid']) {
    const { browser, client } = opened(consent);
    client.selectPractice('box','he'); client.contactClicked(); browser.dispatchEvent(new Event('appinstalled'));
    assert.equal(browser.scripts.length, 0); assert.equal(browser.events().length, 0);
    assert.deepEqual(browser.commands()[0], ['consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}]);
    assert.equal(browser[`ga-disable-${GA_MEASUREMENT_ID}`], true);
  }
});
test('one opt-in initializes the approved production ID exactly once and disables ads/automatic initial views', () => {
  const { browser, client } = opened(); client.setConsent('granted');
  for (let i=0;i<30;i++) client.open('settings','en',true);
  assert.equal(browser.scripts.length,1); assert.equal(browser.scripts[0].referrerPolicy,'no-referrer');
  assert.equal(browser.scripts[0].src,`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
  const configs=browser.commands().filter(([cmd])=>cmd==='config');assert.equal(configs.length,1);
  assert.equal(configs[0][1],GA_MEASUREMENT_ID);assert.equal(configs[0][2].send_page_view,false);
  assert.equal(configs[0][2].allow_google_signals,false);assert.equal(configs[0][2].allow_ad_personalization_signals,false);
  assert.equal(configs[0][2].cookie_expires,90*86400); assert.equal(configs[0][2].cookie_path,'/breathwork-app/');
  assert.equal(browser.events('app_opened').length,1);assert.equal(browser.events('page_view').length,1);
});
test('view deduplication ignores language/rerenders and never replays pre-consent view history', () => {
  const { browser, client } = opened();client.open('library','he',true);client.selectPractice('box','he');
  client.open('details/box','he',true);client.setConsent('granted');
  assert.equal(browser.events('page_view').length,1);assert.equal(browser.events('practice_selected').length,0);
  assert.equal(browser.events('page_view')[0][2].page_location,'https://tomerbreathwork.github.io/breathwork-app/#details/box');
  client.open('details/box','ja',true);assert.equal(browser.events('page_view').length,1);
  for(const view of ['preparation','practice','practice','completed','settings'])client.open(view,'ja',true);
  assert.equal(browser.events('page_view').length,5);
});
test('practice snapshots emit one start and one natural completion, without extra stop or resume strikes', () => {
  const { browser, client } = opened('granted');const run=client.createPractice('coherent','he',187);
  assert.equal(browser.events('practice_started').length,0);run.start();run.start();
  client.open('practice','he',true);client.open('practice','he',true);
  run.complete();run.complete();run.stop(187);
  assert.equal(browser.events('practice_started').length,1);assert.equal(browser.events('practice_completed').length,1);
  assert.equal(browser.events('practice_stopped').length,0);
  const params=browser.events('practice_completed')[0][2];
  assert.equal(params.practice_id,'coherent');assert.equal(params.practice_name,'Coherent Breathing');assert.equal(params.language,'he');assert.equal(params.duration_seconds,187);
});
test('cancelled preparation has no practice events; early stops and deadline stops are classified once', () => {
  const { browser, client } = opened('granted');client.createPractice('box','en',192).stop(0);
  assert.equal(browser.events().filter(([,name])=>name.startsWith('practice_')).length,0);
  const early=client.createPractice('box','en',192);early.start();early.stop(7.25);early.stop(8);early.complete();
  assert.equal(browser.events('practice_stopped').length,1);assert.equal(browser.events('practice_stopped')[0][2].duration_seconds,7.3);
  const deadline=client.createPractice('478','ja',190);deadline.start();deadline.stop(200);deadline.complete();
  assert.equal(browser.events('practice_completed').length,1);assert.equal(browser.events('practice_completed')[0][2].duration_seconds,190);
});
test('revocation disables future hits and removes only application analytics cookies', () => {
  const { browser, client } = opened('granted');browser.cookies.set('bf_ga4_ga','id');browser.cookies.set('bf_ga4_ga_9GMF53JNC3','session');browser.cookies.set('unrelated','keep');
  const count=browser.events().length;client.setConsent('denied');client.open('library','en',true);client.selectPractice('box','en');
  assert.equal(browser.events().length,count);assert.equal(browser[`ga-disable-${GA_MEASUREMENT_ID}`],true);
  assert.deepEqual([...browser.cookies],[['unrelated','keep']]);
  client.setConsent('granted');assert.equal(browser.events('app_opened').length,1);assert.equal(browser.events('page_view').length,2);
  assert.equal(browser.commands().filter(([cmd])=>cmd==='config').length,1);
});
test('offline actions are dropped, with no custom queue or retroactive completed session', () => {
  const browser=new Browser('granted');browser.navigator.onLine=false;const client=new AnalyticsClient(browser);client.open('settings','en',true);
  const run=client.createPractice('box','en',192);run.start();client.selectPractice('box','en');assert.equal(browser.scripts.length,0);
  browser.navigator.onLine=true;browser.dispatchEvent(new Event('online'));run.complete();
  assert.equal(browser.events('app_opened').length,1);assert.equal(browser.events('practice_selected').length,0);assert.equal(browser.events('practice_completed').length,0);
});
test('CSS standalone, iOS standalone and deduplicated supported installation events are detected', () => {
  for(const mode of ['browser','css','ios']){
    const browser=new Browser('granted');browser.standalone=mode==='css';browser.navigator.standalone=mode==='ios';
    const client=new AnalyticsClient(browser);client.open('settings','en',true);browser.dispatchEvent(new Event('appinstalled'));browser.dispatchEvent(new Event('appinstalled'));
    assert.equal(browser.events('app_opened')[0][2].display_mode,mode==='browser'?'browser':'standalone');
    assert.equal(browser.events('pwa_installed').length,1);
  }
});
test('all event parameters are bounded canonical values, with no raw URL, query, referrer or contact data', () => {
  const { browser, client } = opened('granted');client.open('details/private@example.test','unknown-language',true);
  client.selectPractice('private@example.test','unknown-language');client.contactClicked();
  const text=JSON.stringify(browser.commands());assert(!text.includes('private@example.test'));assert(!text.includes('unknown-language'));assert(!text.includes('wa.me'));
  const params=browser.events('practice_selected')[0][2];assert.equal(params.practice_id,'custom');assert.equal(params.language,'en');
  for(const [,name,event] of browser.events()){
    assert(['app_opened','page_view','practice_selected','contact_clicked'].includes(name));
    assert.deepEqual(Object.keys(event).filter(key=>!['practice_id','practice_name','duration_seconds','language','display_mode','page_location','page_referrer','page_title'].includes(key)),[]);
    assert.equal(event.page_referrer,'');
  }
});
test('unavailable storage, cookies, tags and script loading cannot break the app', () => {
  const browser=new Browser();Object.defineProperty(browser,'localStorage',{get(){throw new Error('Denied');}});
  const client=new AnalyticsClient(browser);client.open('settings','en',true);
  browser.document.head.appendChild=()=>{throw new Error('Blocked');};assert.doesNotThrow(()=>client.setConsent('granted'));
  browser.gtag=()=>{throw new Error('Blocked');};assert.doesNotThrow(()=>client.contactClicked());assert.doesNotThrow(()=>client.setConsent('denied'));
  assert.equal(client.getConsent(),'denied');
});
test('storage changes in another tab withdraw consent immediately and development never loads Google', () => {
  const { browser, client }=opened('granted');browser.values.set(ANALYTICS_CONSENT_KEY,'denied');browser.dispatchEvent(Object.assign(new Event('storage'),{key:ANALYTICS_CONSENT_KEY}));
  const count=browser.events().length;client.contactClicked();assert.equal(browser.events().length,count);assert.equal(client.getConsent(),'denied');
  const dev=new Browser('granted'), disabled=new AnalyticsClient(dev);disabled.open('settings','en',false);disabled.contactClicked();
  assert.equal(dev.scripts.length,0);assert.equal(dev.events().length,0);
});
test('DebugView is enabled only by the explicit flag and the flag is not included in page locations', () => {
  const browser=new Browser('granted');browser.location.href='https://tomerbreathwork.github.io/breathwork-app/?analytics_debug=1&secret=hide';
  const client=new AnalyticsClient(browser);client.open('settings','en',true);
  assert.equal(browser.commands().find(([cmd])=>cmd==='config')[2].debug_mode,true);
  for(const [, ,params] of browser.events())assert(!params.page_location.includes('?'));
});
test('existing browser opt-out flags and blocked data layers are respected, never overridden', () => {
  const browser=new Browser('granted');Object.defineProperty(browser,`ga-disable-${GA_MEASUREMENT_ID}`,{value:true,writable:false});
  const client=new AnalyticsClient(browser);assert.doesNotThrow(()=>client.open('settings','en',true));client.setConsent('granted');
  assert.equal(browser.scripts.length,0);assert.equal(browser.events().length,0);
  const blocked=new Browser('granted');Object.defineProperty(blocked,'dataLayer',{get(){throw new Error('Blocked');}});
  const unavailable=new AnalyticsClient(blocked);assert.doesNotThrow(()=>unavailable.open('settings','en',true));assert.doesNotThrow(()=>unavailable.contactClicked());
  assert.equal(blocked.scripts.length,0);
});
