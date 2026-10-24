import {test,expect,type Page} from '@playwright/test';
import en from '../src/locales/en.json' with {type:'json'};
import he from '../src/locales/he.json' with {type:'json'};
import ja from '../src/locales/ja.json' with {type:'json'};
const dictionaries={en,he,ja};
async function silentSettings(page:Page){
 await page.addInitScript(()=>{if(!localStorage.getItem('still-settings'))localStorage.setItem('still-settings',JSON.stringify({rhythm:[4,0,6,0],minutes:5,background:'mountain-lake',sound:'silent',volume:.35}))});
 await page.goto('./');
}
async function noOverflow(page:Page,height:number){
 const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewport:innerWidth}));
 expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);expect(dimensions.height).toBeLessThanOrEqual(height+1);
}
for(const language of ['en','he','ja'] as const){
 const t=dictionaries[language];
 test(`${language}: complete translations, persistent choice and active-screen direction`,async({page})=>{
  await silentSettings(page);await page.locator('.language-picker select').selectOption(language);
  await expect(page.locator('html')).toHaveAttribute('lang',language);await expect(page.locator('html')).toHaveAttribute('dir',language==='he'?'rtl':'ltr');
  await expect(page.getByText(t.tagline,{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:t.custom,exact:false})).toBeVisible();
  await expect(page.getByRole('slider',{name:t.holdIn,exact:true})).toBeVisible();
  await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',language);
  await page.getByRole('button',{name:t.start,exact:true}).click();
  await expect(page.getByRole('heading',{name:t.inhale,exact:true})).toBeVisible();
  await expect(page.locator('.language-picker')).toHaveCount(0);await expect(page.locator('#duration')).toHaveCount(0);
  expect(await page.locator('.breath-circle').evaluate(el=>getComputedStyle(el).direction)).toBe('ltr');
  await expect(page.locator('.remaining')).toContainText(t.remaining);
  expect(await page.locator('.session').innerText()).not.toMatch(/C4|G4|E4/);
  await page.getByRole('button',{name:t.advanced,exact:true}).click();
  await expect(page.getByRole('combobox',{name:t.background,exact:true})).toBeVisible();
  await expect(page.getByRole('combobox',{name:t.sound,exact:true})).toBeVisible();
  await expect(page.getByRole('option',{name:t.sceneLake,exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:t.stop,exact:true}).click();await expect(page.locator('.settings-panel')).toBeVisible();
 });
 for(const viewport of [{width:360,height:740},{width:375,height:812},{width:390,height:844}]){
  test(`${language}: both collapsed screens fit ${viewport.width}×${viewport.height}`,async({page})=>{
   await page.setViewportSize(viewport);await silentSettings(page);await page.locator('.language-picker select').selectOption(language);
   await expect(page.getByRole('button',{name:t.advanced,exact:true})).toHaveAttribute('aria-expanded','false');await noOverflow(page,viewport.height);
   await expect.poll(()=>page.locator('.scenery').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
   if(viewport.width===375)await page.screenshot({path:`/tmp/breath-flow-${language}-settings.png`,fullPage:true});
   for(const button of await page.getByRole('button').all()){const box=await button.boundingBox();if(box)expect(box.height).toBeGreaterThanOrEqual(44)}
   await page.getByRole('button',{name:t.start,exact:true}).click();await expect(page.locator('.session-panel')).toBeVisible();
   await expect(page.getByRole('button',{name:t.advanced,exact:true})).toHaveAttribute('aria-expanded','false');await noOverflow(page,viewport.height);
   if(viewport.width===375)await page.screenshot({path:`/tmp/breath-flow-${language}-session.png`,fullPage:true});
  });
 }
}
test('browser Hebrew detection works before a preference is selected',async({browser})=>{
 const context=await browser.newContext({locale:'he-IL'}),page=await context.newPage();
 await page.goto('http://127.0.0.1:5174/breathwork-app/');await expect(page.locator('html')).toHaveAttribute('lang','he');await expect(page.getByRole('button',{name:he.start,exact:true})).toBeVisible();await context.close();
});
test('hold water and waves stay stationary while the clockwise ring progresses',async({page})=>{
 await silentSettings(page);await page.getByRole('button',{name:'Box breathing'}).click();await page.clock.install();await page.getByRole('button',{name:en.start,exact:true}).click();
 await page.clock.runFor(4200);await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','1');
 const high=await page.locator('.water').getAttribute('style'),arc=await page.locator('.ring-progress').getAttribute('stroke-dashoffset');
 expect(await page.locator('.wave').evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');
 await page.clock.runFor(1500);await expect(page.locator('.water')).toHaveAttribute('style',high!);await expect(page.locator('.ring-progress')).not.toHaveAttribute('stroke-dashoffset',arc!);
 await page.clock.runFor(6500);await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','3');
 const low=await page.locator('.water').getAttribute('style');await page.clock.runFor(1000);await expect(page.locator('.water')).toHaveAttribute('style',low!);
 expect(high).toContain('100%');expect(low).toContain('0%');
});
test('remaining time pauses correctly; restart and stop preserve settings',async({page})=>{
 await silentSettings(page);await page.clock.install();await page.getByRole('button',{name:en.start,exact:true}).click();
 await page.clock.runFor(2300);await page.getByRole('button',{name:en.pause,exact:true}).click();const time=await page.locator('.remaining-value').innerText();
 await page.clock.runFor(5000);await expect(page.locator('.remaining-value')).toHaveText(time);
 await page.getByRole('button',{name:en.resume,exact:true}).click();await page.clock.runFor(1100);await expect(page.locator('.remaining-value')).not.toHaveText(time);
 await page.getByRole('button',{name:en.restart,exact:true}).click();await expect(page.locator('.remaining-value')).toHaveText('05:00');
 await page.getByRole('button',{name:en.stop,exact:true}).click();await expect(page.locator('#duration')).toHaveValue('5');
 await expect(page.getByRole('spinbutton',{name:'Inhale seconds',exact:true})).toHaveValue('4');
});
test('advanced options expand, remain usable on small screens and allow scrolling',async({page})=>{
 await page.setViewportSize({width:320,height:568});await silentSettings(page);await page.getByRole('button',{name:en.advanced,exact:true}).click();
 await expect(page.getByRole('combobox',{name:en.sound,exact:true})).toBeVisible();await page.getByRole('button',{name:en.reset,exact:true}).scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeGreaterThan(568);
 await page.getByRole('button',{name:en.advanced,exact:true}).click();await expect(page.getByRole('combobox',{name:en.sound,exact:true})).toHaveCount(0);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:en.start,exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:en.start,exact:true})).toBeVisible();
});
test('custom keeps the existing rhythm and blank session duration does not crash',async({page})=>{
 await silentSettings(page);await page.getByRole('button',{name:'Custom'}).click();await expect(page.getByRole('spinbutton',{name:'Inhale seconds',exact:true})).toHaveValue('4');
 await page.locator('#duration').fill('');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:en.start,exact:true})).toBeDisabled();
 await page.locator('#duration').fill('2');await expect(page.getByRole('button',{name:en.start,exact:true})).toBeEnabled();
});
test('browser back exits the session without discarding preferences or restarting audio',async({page})=>{
 await silentSettings(page);await page.getByRole('button',{name:en.start,exact:true}).click();await expect(page.locator('.session-panel')).toBeVisible();
 await page.goBack();await expect(page.locator('.settings-panel')).toBeVisible();await expect(page.locator('#duration')).toHaveValue('5');
});
test('active visual/audio preferences keep the session clock and phase intact',async({page})=>{
 await silentSettings(page);await page.clock.install();await page.getByRole('button',{name:en.start,exact:true}).click();await page.clock.runFor(1500);
 await page.getByRole('button',{name:en.advanced,exact:true}).click();await page.getByRole('combobox',{name:en.background,exact:true}).selectOption('photo-1');
 await page.getByRole('slider',{name:en.volume,exact:true}).fill('0.2');await expect(page.locator('.remaining-value')).not.toHaveText('05:00');
 await page.getByRole('combobox',{name:en.sound,exact:true}).selectOption('bowls');await expect(page.getByRole('status')).toHaveText(en.audioReady,{timeout:15000});
 const time=await page.locator('.remaining-value').innerText();await page.clock.runFor(1000);await expect(page.locator('.remaining-value')).not.toHaveText(time);await expect(page.locator('.session-panel')).toBeVisible();
});
test('branding and manifest assets respect the GitHub Pages subpath',async({page,request})=>{
 await page.goto('./');await expect(page).toHaveTitle(/Breath Flow/);
 for(const file of ['brush-circle.svg','app-icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','app.webmanifest'])expect((await request.get(`branding/${file}`)).status()).toBe(200);
 const manifest=await (await request.get('branding/app.webmanifest')).json();expect(manifest.start_url).toBe('../');expect(manifest.icons).toHaveLength(3);
});

test('sound preview plays on settings; active preview pauses and resume seeks the phase',async({page})=>{
 await page.goto('./');
 await page.evaluate(()=>{
  const Native=window.AudioContext;(window as any).offsets=[];
  window.AudioContext=class extends Native{
   createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{(window as any).offsets.push(args[1]||0);start(...args)};return source}
  };
 });
 await page.getByRole('button',{name:en.advanced,exact:true}).click();
 await page.getByRole('button',{name:en.preview,exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).offsets.length)).toBe(1);
 await page.clock.install();await page.getByRole('button',{name:en.start,exact:true}).click();await expect(page.locator('.session-panel')).toBeVisible();await page.clock.runFor(1200);
 await page.getByRole('button',{name:en.advanced,exact:true}).click();await page.getByRole('button',{name:en.preview,exact:true}).click();await expect(page.getByRole('heading',{name:en.paused,exact:true})).toBeVisible();
 const time=await page.locator('.remaining-value').innerText();await page.clock.runFor(2000);await expect(page.locator('.remaining-value')).toHaveText(time);
 await expect(page.getByRole('status')).toHaveText(en.audioReady);const count=await page.evaluate(()=>(window as any).offsets.length);
 await page.getByRole('button',{name:en.resume,exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).offsets.length)).toBe(count+1);
 expect(await page.evaluate(()=>(window as any).offsets.at(-1))).toBeGreaterThan(1);
});
