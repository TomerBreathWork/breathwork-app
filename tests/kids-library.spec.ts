import {test,expect,type Page} from '@playwright/test';
import en from '../src/locales/en.json' with {type:'json'};
import he from '../src/locales/he.json' with {type:'json'};
import ja from '../src/locales/ja.json' with {type:'json'};
import {observeSamples} from './sample-observer';
const locales={en,he,ja};
const adult={preset:'custom',practiceId:'custom',rhythm:[6.5,1.5,8,.5],customRhythm:[6.5,1.5,8,.5],minutes:7,sound:'silent',volume:.6,audioOutputVersion:1,background:'photo-2'};
async function open(page:Page,language='en',child?:unknown,sound='silent',adultProfile=adult){
 await page.addInitScript(({language,child,adult})=>{
  if(!sessionStorage.getItem('kids-test-seeded')) {
   localStorage.setItem('breath-flow-flower-candle-introduction',JSON.stringify({version:1,he:{enabled:false,acknowledged:false}}));
   localStorage.setItem('breath-flow-language',language);localStorage.setItem('still-settings',JSON.stringify(adult));
   if(child!==undefined)localStorage.setItem('breath-flow-kids-settings',JSON.stringify({version:1,flowerCandle:child}));
   sessionStorage.setItem('kids-test-seeded','yes');
  }
 },{language,child,adult:{...adultProfile,sound}});
 await page.goto('./');await page.locator('.explore-choice').click();
}
async function details(page:Page,language='en'){
 await page.getByRole('button',{name:locales[language as keyof typeof locales].categoryKids,exact:true}).click();
 await page.locator('[data-practice="flower-candle"]').click();await expect(page.locator('.kids-details')).toBeVisible();
}
async function settings(page:Page){await page.locator('.kids-practice-settings summary').click();}
async function setRhythm(page:Page,n:number){await page.locator('#kids-inhale').focus();await page.keyboard.press('Home');for(let i=1;i<n;i++)await page.keyboard.press('ArrowRight');}
async function fits(page:Page){const box=await page.locator('.app-page').evaluate(n=>({w:n.clientWidth,sw:n.scrollWidth,h:n.clientHeight,sh:n.scrollHeight}));expect(box.sw).toBeLessThanOrEqual(box.w+1);return box;}
for(const [language,t] of Object.entries(locales))for(const [width,height]of[[320,568],[360,640],[375,667],[390,844]]) {
 test(`${language} ${width}: four filters, audience grouping, illustrated introduction and active layout`,async({page})=>{
  await page.setViewportSize({width,height});await page.clock.install();await open(page,language);
  const filters=page.locator('.category-filters button');await expect(filters).toHaveCount(4);
  await expect(filters).toHaveText([t.allPractices,t.categoryCalm,t.categoryFocus,t.categoryKids]);
  for(const filter of await filters.all()){const b=await filter.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);expect(await filter.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);}
  await expect(page.locator('.practice-card')).toHaveCount(7);await expect(page.locator('.kids-group-title')).toHaveText(t.categoryKids);
  await page.getByRole('button',{name:t.categoryCalm,exact:true}).click();await expect(page.getByRole('button',{name:t.categoryCalm,exact:true})).toBeFocused();await expect(page.locator('.practice-card')).toHaveCount(3);await expect(page.locator('[data-practice="box"]')).toHaveCount(0);
  await page.getByRole('button',{name:t.categoryFocus,exact:true}).click();await expect(page.locator('.practice-card')).toHaveCount(3);await expect(page.locator('[data-practice="flower-candle"]')).toHaveCount(0);
  await details(page,language);await expect(page.locator('.kids-steps')).toContainText(t.kidsStep1Body);await expect(page.locator('.kids-steps')).toContainText(t.kidsStep2Body);
  await expect(page.locator('audio')).toHaveCount(0);await expect(page.getByText(t.kidsVoice,{exact:true})).toHaveCount(language==='he'?1:0);
  await expect(page.locator('.app-page')).toHaveAttribute('dir',language==='he'?'rtl':'ltr');await fits(page);
  await settings(page);await expect(page.locator('#kids-inhale')).toHaveAttribute('min','1');await expect(page.locator('#kids-inhale')).toHaveAttribute('max','6');await expect(page.locator('#kids-inhale')).toHaveAttribute('step','1');
  await expect(page.locator('input[type="range"]')).toHaveCount(1);await expect(page.locator('#phase-value-1,#phase-value-3')).toHaveCount(0);
  await expect(page.locator('#kids-inhale')).toHaveValue('2');await expect(page.locator('#duration')).toHaveValue('1');
  await page.locator('.start-button').click();await expect(page.locator('.phase-count')).toHaveText('3');await expect(page.locator('.remaining-value')).toHaveText('01:00');
  await page.clock.runFor(3500);await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','flower');
  const box=await fits(page);expect(box.sh).toBeLessThanOrEqual(box.h+1);await expect(page.getByRole('button',{name:t.stop,exact:true})).toBeInViewport();
  await page.clock.runFor(2000);await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','candle');
  await page.getByRole('button',{name:t.stop,exact:true}).click();await expect(page.locator('.kids-details')).toBeVisible();
 });
}
for(const inhale of[1,2,3,4,5,6])test(`${inhale}:${inhale*2}: ratios, saved profile and protected Back/Forward`,async({page})=>{
 await page.clock.install();await open(page);await details(page);await settings(page);await setRhythm(page,inhale);
 await page.locator('#duration').fill('2');await expect(page.locator('.kids-ratio')).toContainText(String(inhale*2));
 const savedAdult=await page.evaluate(()=>localStorage.getItem('still-settings'));
 await page.locator('.start-button').click();await page.clock.runFor(3100+inhale*1000);await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','candle');
 await page.goBack();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:en.stayInPractice,exact:true}).click();
 await expect(page.getByRole('button',{name:en.resume,exact:true})).toBeVisible();const time=await page.locator('.remaining-value').innerText();await page.clock.runFor(5000);await expect(page.locator('.remaining-value')).toHaveText(time);
 await page.getByRole('button',{name:en.resume,exact:true}).click();await page.clock.runFor(200);
 await page.goBack();await page.getByRole('button',{name:en.endPractice,exact:true}).click();await expect(page.locator('.kids-details')).toBeVisible();
 await page.goForward();await expect(page.locator('.kids-details')).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('still-settings'))).toBe(savedAdult);
 await page.reload();await expect(page.locator('.home-welcome')).toBeVisible();await page.locator('.explore-choice').click();await details(page);await settings(page);
 await expect(page.locator('#kids-inhale')).toHaveValue(String(inhale));await expect(page.locator('#duration')).toHaveValue('2');
 const child=await page.evaluate(()=>JSON.parse(localStorage.getItem('breath-flow-kids-settings')!).flowerCandle);expect(child.rhythm).toEqual([inhale,0,2*inhale,0]);
});
test('invalid stored profile normalizes without disturbing adult Custom and Back restores Kids filter',async({page})=>{
 await open(page,'en',{rhythm:[99,8,1,8],minutes:-3});await details(page);await settings(page);await expect(page.locator('#kids-inhale')).toHaveValue('6');await expect(page.locator('#duration')).toHaveValue('1');
 await page.locator('.discovery-back').click();await expect(page.getByRole('button',{name:en.categoryKids,exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.practice-card')).toHaveCount(2);
 await page.locator('.discovery-back').click();await page.locator('[data-home-choice="custom"]').click();
 for(const [i,value]of adult.rhythm.entries())await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(value));await expect(page.locator('#duration')).toHaveValue('7');
});
test('completion returns to introduction once; final recorded cue is not abruptly cancelled',async({page})=>{
 await page.clock.install();await page.addInitScript(observeSamples);await open(page,'en',undefined,'recordings');await details(page);
 await page.locator('.start-button').click();await page.clock.runFor(3500);await expect.poll(()=>page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBeGreaterThan(0);
 const before=await page.evaluate(()=>(window as any).sampleAudio.starts.map((s:any)=>s.stops.length));
 await page.clock.fastForward(60000);await page.clock.runFor(32);await expect(page.locator('.kids-details')).toBeVisible();
 const after=await page.evaluate(()=>(window as any).sampleAudio.starts.map((s:any)=>s.stops.length));expect(after.slice(0,before.length)).toEqual(before);
 await page.goForward();await expect(page.locator('.session-panel')).toHaveCount(0);
});
test('preparation interruption, Restart, reduced motion and enlarged text stay usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await open(page);await details(page);
 await page.locator('.start-button').click();await page.clock.runFor(1000);await page.goBack();await page.getByRole('button',{name:en.stayInPractice,exact:true}).click();
 await expect(page.getByRole('button',{name:en.resume,exact:true})).toBeVisible();await page.getByRole('button',{name:en.restart,exact:true}).click();await expect(page.locator('.phase-count')).toHaveText('3');
 await page.clock.runFor(3500);await expect(page.locator('.kids-flower')).toHaveCSS('transform','none');
 await page.addStyleTag({content:'html{font-size:32px!important}'});await page.getByRole('button',{name:en.stop,exact:true}).click();await expect(page.locator('.kids-details')).toBeVisible();
 await page.locator('.start-button').scrollIntoViewIfNeeded();await expect(page.locator('.start-button')).toBeInViewport();
});

for(const [id,preset,rhythm]of [['coherent','coherentBreathing',[5.5,0,5.5,0]],['box','boxBreathing',[6,6,6,6]],['478','eveningUnwind',[4,7,8,0]]] as const)
 test(`${id}: children settings leave the last adult configuration intact`,async({page})=>{
  await open(page,'en',undefined,'silent',{...adult,practiceId:id,preset,rhythm:[...rhythm],minutes:5});
  const before=await page.evaluate(()=>localStorage.getItem('still-settings'));
  await details(page);await settings(page);await setRhythm(page,6);await page.locator('#duration').fill('3');
  expect(await page.evaluate(()=>localStorage.getItem('still-settings'))).toBe(before);
  await page.locator('.discovery-back').click();await page.locator('.discovery-back').click();
  await page.locator(`[data-home-choice="${id}"]`).click();
  for(const [i,value]of rhythm.entries())await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(value));
  await expect(page.locator('#duration')).toHaveValue('5');
 });
test('existing analytics records the real Kids identity and one terminal event',async({page})=>{
 test.skip(process.env.PLAYWRIGHT_TEST_PRODUCTION!=='1','GA lifecycle is enabled only in production builds.');
 await page.clock.install();await page.addInitScript(()=>localStorage.setItem('breath-flow-analytics-consent','granted'));
 await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.route('https://*.google-analytics.com/**',r=>r.abort());
 await open(page);await details(page);await page.locator('.start-button').click();await page.clock.runFor(3500);
 await page.getByRole('button',{name:en.stop,exact:true}).click();await page.locator('.start-button').click();await page.clock.runFor(3500);
 await page.clock.fastForward(60000);await page.clock.runFor(32);await expect(page.locator('.kids-details')).toBeVisible();
 const events=await page.evaluate(()=>(window.dataLayer??[]).map(e=>Array.from(e as ArrayLike<any>)).filter(([c,n,p])=>c==='event'&&p?.practice_id==='flower-candle'));
 expect(events.filter(e=>e[1]==='practice_started')).toHaveLength(2);expect(events.filter(e=>e[1]==='practice_stopped')).toHaveLength(1);expect(events.filter(e=>e[1]==='practice_completed')).toHaveLength(1);
 expect(events.every(e=>e[2].practice_name==='Flower & Candle')).toBe(true);
});
