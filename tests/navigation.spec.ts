import {test,expect,type Page} from '@playwright/test';
import en from '../src/locales/en.json' with {type:'json'};
import he from '../src/locales/he.json' with {type:'json'};
import ja from '../src/locales/ja.json' with {type:'json'};
import {observeSamples} from './sample-observer';
const locales={en,he,ja};
async function open(page:Page,language='en',saved:Record<string,unknown>={}){
 await page.addInitScript(({language,saved})=>{
  if(!sessionStorage.getItem('navigation-test-initialized')){
   localStorage.setItem('breath-flow-language',language);
   localStorage.setItem('still-settings',JSON.stringify({sound:'silent',audioOutputVersion:1,volume:.7,background:'photo-2',...saved}));
   sessionStorage.setItem('navigation-test-initialized','1');
  }
 },{language,saved});
 await page.goto('./');await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','choosing');
}
async function select(page:Page,id='coherent'){await page.locator(`[data-home-choice="${id}"]`).click();await expect(page.locator('.start-button')).toBeEnabled();}
async function waitGuard(page:Page,t=en,clock=false){
 await expect(page.getByRole('dialog',{name:t.leavePracticeTitle})).toBeVisible();
 if(clock)await expect.poll(async()=>{await page.clock.runFor(1);return page.getByRole('button',{name:t.stayInPractice,exact:true}).isEnabled();}).toBe(true);
 else await expect(page.getByRole('button',{name:t.stayInPractice,exact:true})).toBeEnabled();
}
for(const [language,t]of Object.entries(locales)){
 test(`${language}: every fresh document opens chooser, saved settings survive and warm foreground does not reset`,async({page})=>{
  const rhythm=[6.5,1.5,8,.5];await open(page,language,{preset:'custom',practiceId:'custom',rhythm,customRhythm:rhythm,minutes:7,homePracticeSelected:true});
  await select(page,'custom');for(let i=0;i<4;i++)await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(rhythm[i]));
  await expect(page.locator('#duration')).toHaveValue('7');
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','selected');
  await page.reload();await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','choosing');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('still-settings')!));
  expect(saved.rhythm).toEqual(rhythm);expect(saved.minutes).toBe(7);expect(saved.volume).toBe(.7);expect(saved.background).toBe('photo-2');expect(saved.navigation).toBeUndefined();
  await select(page,'custom');await expect(page.locator('#phase-value-0')).toHaveValue('6.5');
 });
 test(`${language}: Back/Forward traverses both Home states, Library and edited Details without resetting drafts`,async({page})=>{
  await open(page,language);await select(page,'box');await page.locator('#phase-value-0').fill('6.5');await page.locator('#phase-value-0').blur();
  await page.goBack();await expect(page.locator('.home-welcome')).toBeVisible();await page.goForward();
  await expect(page.locator('#phase-value-1')).toHaveValue('6.5');
  await page.locator('.explore-choice').click();await page.locator('[data-practice="extended"]').click();
  await page.locator('#practice-base').fill('5.5');await page.locator('#duration').fill('5');await page.locator('#duration').blur();
  await page.goBack();await expect(page.locator('.practice-list')).toBeVisible();await page.goBack();
  await expect(page.locator('.selected-practice-heading h2')).toHaveText(t.boxBreathing);await expect(page.locator('#phase-value-0')).toHaveValue('6.5');
  await page.goForward();await page.goForward();await expect(page.locator('#practice-base')).toHaveValue('5.5');await expect(page.locator('#duration')).toHaveValue('5');
 });
 test(`${language}: session Back pauses, Stay preserves it, and only confirmation ends it`,async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.clock.install();await open(page,language);await select(page);
  await page.locator('.start-button').click();await page.clock.runFor(4200);
  await page.goBack();await waitGuard(page,t,true);await expect(page.getByRole('button',{name:t.stayInPractice,exact:true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:t.endPractice,exact:true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:t.stayInPractice,exact:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:t.endPractice,exact:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:t.stayInPractice,exact:true})).toBeFocused();
  await expect(page.getByRole('button',{name:t.resume,exact:true})).toBeVisible();
  const remaining=await page.locator('.remaining-value').innerText();await page.clock.runFor(6000);await expect(page.locator('.remaining-value')).toHaveText(remaining);
  await page.getByRole('button',{name:t.stayInPractice,exact:true}).click();await expect(page.locator('.session-exit-dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:t.resume,exact:true})).toBeFocused();
  await page.clock.runFor(5000);await expect(page.locator('.remaining-value')).toHaveText(remaining);
  await page.getByRole('button',{name:t.resume,exact:true}).click();await page.clock.runFor(1200);expect(await page.locator('.remaining-value').innerText()).not.toBe(remaining);
  await page.goBack();await waitGuard(page,t,true);await page.getByRole('button',{name:t.endPractice,exact:true}).click();await page.clock.runFor(10);
  await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','selected');
  await page.goForward();await expect(page.locator('.session-panel')).toHaveCount(0);await expect(page.locator('.start-button')).toBeEnabled();
  await page.goBack();await page.clock.runFor(10);await expect(page.locator('.home-welcome')).toBeVisible();
 });
}
test('preparation Back stays silent and paused, Escape is Stay, Resume continues without restarting preparation',async({page})=>{
 await page.clock.install();await page.addInitScript(observeSamples);await open(page,'en',{sound:'bowls'});await select(page);
 await page.locator('.start-button').click();await page.clock.runFor(1100);await page.goBack();await waitGuard(page,en,true);
 const n=await page.locator('.phase-count').innerText();await page.clock.runFor(6000);await expect(page.locator('.phase-count')).toHaveText(n);
 expect(await page.evaluate(()=>(window as any).sampleAudio.starts)).toEqual([]);
 await page.keyboard.press('Escape');await expect(page.locator('.session-exit-dialog')).toHaveCount(0);
 await page.getByRole('button',{name:en.resume,exact:true}).click();await page.clock.runFor(2100);
 await expect(page.locator('.circle-label h2')).toHaveText(en.inhale);
 await expect.poll(()=>page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(1);
 await page.getByRole('button',{name:en.stop,exact:true}).click();await page.clock.runFor(5);await expect(page.locator('.settings-panel')).toBeVisible();
});
test('rapid Back and multi-entry jump show one confirmation and preserve Forward without phantom starts',async({page})=>{
 await open(page);await select(page);await page.locator('.explore-choice').click();await page.locator('[data-practice="box"]').click();
 await page.locator('.start-button').click();
 await page.evaluate(()=>{history.back();history.back();});await waitGuard(page);
 await expect(page.locator('.session-exit-dialog')).toHaveCount(1);await page.getByRole('button',{name:en.stayInPractice,exact:true}).click();
 await page.evaluate(()=>history.go(-4));await waitGuard(page);await page.getByRole('button',{name:en.endPractice,exact:true}).click();
 await expect(page.locator('.home-welcome')).toBeVisible();
 await page.goForward();await expect(page.locator('.start-button')).toBeEnabled();
 await page.goForward();await expect(page.locator('.practice-list')).toBeVisible();
 await page.goForward();await expect(page.locator('[data-practice-detail="box"]')).toBeVisible();
 await page.goForward();await expect(page.locator('.session-panel')).toHaveCount(0);await expect(page.locator('[data-practice-detail="box"]')).toBeVisible();
});
test('completed sessions and explicit Stop never restart from Forward; Restart adds no extra history entry',async({page})=>{
 await page.clock.install();await open(page);await select(page);await page.locator('#duration').fill('1');await page.locator('#duration').blur();await page.locator('.start-button').click();
 const length=await page.evaluate(()=>history.length);await page.getByRole('button',{name:en.restart,exact:true}).click();expect(await page.evaluate(()=>history.length)).toBe(length);
 await page.clock.runFor(3020);await page.clock.fastForward(66000);await page.clock.runFor(32);await expect(page.locator('.breath-circle')).toHaveAttribute('data-status','completed');
 await page.goBack();await expect(page.locator('.session-exit-dialog')).toHaveCount(0);await expect(page.locator('.start-button')).toBeEnabled();
 await page.goForward();await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.locator('.start-button').click();await page.getByRole('button',{name:en.stop,exact:true}).click();await page.clock.runFor(10);await expect(page.locator('.start-button')).toBeEnabled();
 await page.goForward();await expect(page.locator('.session-panel')).toHaveCount(0);
});
test('root does not manufacture history entries or trap Back to an external document; fresh reload discards stale session UI only',async({page})=>{
 await page.goto('about:blank');await open(page,'en',{preset:'boxBreathing',rhythm:[5,5,5,5],minutes:5});
 const length=await page.evaluate(()=>history.length);await page.waitForTimeout(100);expect(await page.evaluate(()=>history.length)).toBe(length);
 await select(page,'box');await page.locator('.start-button').click();page.once('dialog',dialog=>dialog.accept());await page.reload();
 await expect(page.locator('.home-welcome')).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
 await select(page,'box');await expect(page.locator('#phase-value-0')).toHaveValue('5');
 await page.reload();await expect(page.locator('.home-welcome')).toBeVisible();
});
test('analytics and samples do not duplicate on guarded Back/Stay/Forward',async({page})=>{
 await page.clock.install();await page.addInitScript(observeSamples);
 await page.addInitScript(()=>localStorage.setItem('breath-flow-analytics-consent','granted'));
 await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.route('https://*.google-analytics.com/**',r=>r.abort());
 await open(page,'en',{sound:'bowls',minutes:1});await select(page);await page.locator('.start-button').click();await page.clock.runFor(3500);
 await expect.poll(()=>page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(1);
 const events=(name:string)=>page.evaluate(name=>(window.dataLayer??[]).map(x=>Array.from(x as ArrayLike<any>)).filter(([c,n])=>c==='event'&&n===name).length,name);
 expect(await events('practice_started')).toBe(1);await page.goBack();await waitGuard(page,en,true);
 await page.getByRole('button',{name:en.stayInPractice,exact:true}).click();await page.clock.runFor(5000);expect(await events('practice_stopped')).toBe(0);
 await page.goBack();await waitGuard(page,en,true);await page.getByRole('button',{name:en.endPractice,exact:true}).click();await page.clock.runFor(10);
 await expect(page.locator('.start-button')).toBeEnabled();expect(await events('practice_stopped')).toBe(1);
 await page.goForward();await page.clock.runFor(5000);expect(await events('practice_started')).toBe(1);expect(await events('practice_stopped')).toBe(1);
 expect(await page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(1);
});

test('root Back reaches the real preceding document and Forward returns without a history trap',async({page})=>{
 await page.route('**/navigation-previous',route=>route.fulfill({contentType:'text/html',body:'<h1>Previous document</h1>'}));
 await page.goto('http://127.0.0.1:5174/navigation-previous');await open(page);
 await page.goBack();await expect(page.getByRole('heading',{name:'Previous document'})).toBeVisible();
 await page.goForward();await expect(page.locator('.home-welcome')).toBeVisible();
});
test('saved pre-reload browser entries remain navigable without reviving the ended engine',async({page})=>{
 await open(page);await select(page,'box');await page.locator('.start-button').click();
 page.once('dialog',dialog=>dialog.accept());await page.reload();await expect(page.locator('.home-welcome')).toBeVisible();
 await page.goBack();await expect(page.locator('.selected-practice-heading h2')).toHaveText(en.boxBreathing);
 await page.goForward();await expect(page.locator('.home-welcome')).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
});
test('resume after Stay continues the recorded cue at its offset without another practice start',async({page})=>{
 await page.clock.install();await page.addInitScript(observeSamples);await open(page,'en',{sound:'bowls'});await select(page);
 await page.locator('.start-button').click();await page.clock.runFor(4300);
 await expect.poll(()=>page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(1);
 await page.waitForTimeout(120);await page.goBack();await waitGuard(page,en,true);
 await page.getByRole('button',{name:en.stayInPractice,exact:true}).click();
 const cues=await page.evaluate(()=>(window as any).sampleAudio.starts.length);await page.clock.runFor(4000);
 expect(await page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(cues);
 await page.getByRole('button',{name:en.resume,exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(cues+1);
 expect(await page.evaluate(()=>(window as any).sampleAudio.starts.at(-1).offset)).toBeGreaterThan(0);
});

test('backgrounding and warm foreground preserve the same paused practice and history position',async({page})=>{
 await page.clock.install();await open(page);await select(page);await page.locator('.start-button').click();await page.clock.runFor(4200);
 const entry=await page.evaluate(()=>history.state.breathFlowNavigation);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.getByRole('button',{name:en.resume,exact:true})).toBeVisible();const remaining=await page.locator('.remaining-value').innerText();
 await page.clock.runFor(6000);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('.remaining-value')).toHaveText(remaining);await expect(page.locator('.home-welcome')).toHaveCount(0);
 expect(await page.evaluate(()=>history.state.breathFlowNavigation)).toEqual(entry);
});

test('confirmed Back from Details emits only the destination page view, never a transient Home view',async({page})=>{
 await page.clock.install();await page.addInitScript(()=>localStorage.setItem('breath-flow-analytics-consent','granted'));
 await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));await page.route('https://*.google-analytics.com/**',r=>r.abort());
 await open(page);await page.locator('.explore-choice').click();await page.locator('[data-practice="box"]').click();await page.locator('.start-button').click();await page.clock.runFor(3200);
 await page.goBack();await waitGuard(page,en,true);
 const before=await page.evaluate(()=>(window.dataLayer??[]).length);
 await page.getByRole('button',{name:en.endPractice,exact:true}).click();await page.clock.runFor(5);
 await expect(page.locator('[data-practice-detail="box"]')).toBeVisible();
 const views=await page.evaluate(before=>(window.dataLayer??[]).slice(before).map(x=>Array.from(x as ArrayLike<any>)).filter(([c,n])=>c==='event'&&n==='page_view').map(([, ,p])=>p.page_location),before);
 expect(views).toHaveLength(1);expect(views[0]).toMatch(/#details\/box$/);
});
for(const [language,t]of Object.entries(locales))test(`${language}: exit dialog blocks underlying controls and repeated Back while preserving one clean End`,async({page})=>{
 await page.clock.install();
 await page.addInitScript(()=>localStorage.setItem('breath-flow-analytics-consent','granted'));
 await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.route('https://*.google-analytics.com/**',r=>r.abort());
 await open(page,language);await select(page);await page.locator('.explore-choice').click();await page.locator('[data-practice="box"]').click();
 await page.locator('.start-button').click();await page.clock.runFor(3400);await page.goBack();await waitGuard(page,t,true);
 const dialog=page.getByRole('dialog',{name:t.leavePracticeTitle});
 await expect(dialog).toHaveAttribute('open','');await expect(dialog).toContainText(t.leavePracticeBody);
 if(language==='he'){
  await expect(dialog.getByRole('heading')).toHaveText('לסיים את התרגול?');
  await expect(dialog.locator('p')).toHaveText('התרגול מושהה. אפשר להמשיך מאותה נקודה או לסיים.');
  await expect(dialog.getByRole('button',{name:'להישאר',exact:true})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'סיום התרגול',exact:true})).toBeVisible();
 }
 const sessionEntry=await page.evaluate(()=>history.state.breathFlowNavigation);
 const historyLength=await page.evaluate(()=>history.length);
 const remaining=await page.locator('.remaining-value').innerText();
 const muted=await page.locator('.practice-mute').getAttribute('aria-pressed');
 const stopEvents=()=>page.evaluate(()=>(window.dataLayer??[]).map(x=>Array.from(x as ArrayLike<any>)).filter(([c,n])=>c==='event'&&n==='practice_stopped').length);
 for(const control of await page.locator('.session-controls button,.practice-mute').all()){
  const box=(await control.boundingBox())!;
  // Native pointer input at the real underlying coordinates must hit the modal
  // backdrop, never Resume, Restart, Stop or Mute underneath it.
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await expect(dialog).toBeVisible();
  await control.evaluate(el=>(el as HTMLElement).focus());
  expect(await control.evaluate(el=>document.activeElement===el)).toBe(false);
 }
 await page.clock.runFor(6000);await expect(page.locator('.remaining-value')).toHaveText(remaining);
 await expect(page.locator('.practice-mute')).toHaveAttribute('aria-pressed',muted!);
 expect(await stopEvents()).toBe(0);
 for(let i=0;i<3;i++){
  await page.goBack();await waitGuard(page,t,true);
  await expect(page.locator('.session-exit-dialog')).toHaveCount(1);
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-status','paused');
  expect(await page.evaluate(()=>history.state.breathFlowNavigation)).toEqual(sessionEntry);
  expect(await page.evaluate(()=>history.length)).toBe(historyLength);
  expect(await stopEvents()).toBe(0);
 }
 await page.getByRole('button',{name:t.stayInPractice,exact:true}).click();
 await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:t.resume,exact:true})).toBeFocused();
 await page.clock.runFor(3000);await expect(page.locator('.remaining-value')).toHaveText(remaining);
 await page.goBack();await waitGuard(page,t,true);
 await page.getByRole('button',{name:t.endPractice,exact:true}).dblclick();await page.clock.runFor(5);
 await expect(page.locator('[data-practice-detail="box"]')).toBeVisible();
 expect(await stopEvents()).toBe(1);
 await page.goForward();await page.clock.runFor(4000);
 await expect(page.locator('.session-panel')).toHaveCount(0);expect(await stopEvents()).toBe(1);
});
