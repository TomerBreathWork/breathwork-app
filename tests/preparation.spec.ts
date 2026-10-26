import { configureBreathing } from "./configure-breathing";
import {test,expect} from '@playwright/test';
import en from '../src/locales/en.json' with {type:'json'};
import he from '../src/locales/he.json' with {type:'json'};
import ja from '../src/locales/ja.json' with {type:'json'};
test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2026-10-24T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-24T12:00:01Z'));
});
for(const [language,t]of Object.entries({en,he,ja})){
 test(`${language}: preparation lasts five full seconds with falling water and a frozen session timer`,async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.addInitScript(({language})=>{localStorage.setItem('breath-flow-language',language);localStorage.setItem('still-settings',JSON.stringify({rhythm:[4,0,6,0],minutes:10,background:'photo-1',sound:'silent',volume:.35}))},{language});
  await page.goto('./');await configureBreathing(page,{rhythm:[4,0,6,0],minutes:10});await page.getByRole('button',{name:t.start,exact:true}).click();
  await expect(page.getByRole('heading',{name:t.preparationInstruction,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(812);
  await expect(page.locator('.phase-count')).toHaveText('5');await expect(page.locator('.water')).toHaveAttribute('style','height: 100%;');
  for(let i=1;i<5;i++){await page.clock.runFor(i===1?1020:1000);await expect(page.locator('.phase-count')).toHaveText(String(5-i));await expect(page.locator('.remaining-value')).toHaveText('10:00')}
  const fill=await page.locator('.water').evaluate(el=>parseFloat((el as HTMLElement).style.height));expect(fill).toBeLessThan(21);expect(fill).toBeGreaterThan(19);
  await page.clock.runFor(970);await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','preparation');
  await page.clock.runFor(30);await expect(page.getByRole('heading',{name:t.inhale,exact:true})).toBeVisible();await expect(page.locator('.remaining-value')).toHaveText('10:00');
  await page.clock.runFor(1200);await expect(page.locator('.remaining-value')).not.toHaveText('10:00');
 });
}
test('preparation pause/resume/restart/stop preserve time and never trigger sound',async({page})=>{
 await page.addInitScript(()=>{
  const Native=window.AudioContext;(window as any).notes=[];const notes=new Map<AudioBuffer,number>(),Offline=window.OfflineAudioContext;
  window.OfflineAudioContext=class extends Offline{
   frequency=0;
   createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...args)=>{if(!this.frequency)this.frequency=o.frequency.value;start(...args)};return o}
   async startRendering(){const buffer=await super.startRendering();notes.set(buffer,this.frequency);return buffer}
  };
  window.AudioContext=class extends Native{createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{(window as any).notes.push(notes.get(source.buffer!));start(...args)};return source}};
 });
 await page.goto('./');await page.getByRole('button',{name:en.start,exact:true}).click();await expect(page.locator('.session-panel')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).notes)).toEqual([]);
 await page.clock.runFor(2000);await page.getByRole('button',{name:en.pause,exact:true}).click();const count=await page.locator('.phase-count').innerText();
 await page.clock.runFor(8000);await expect(page.locator('.phase-count')).toHaveText(count);await expect(page.locator('.remaining-value')).toHaveText('03:07');
 await page.getByRole('button',{name:en.resume,exact:true}).click();await page.clock.runFor(1020);await expect(page.locator('.phase-count')).toHaveText('2');
 await page.getByRole('button',{name:en.restart,exact:true}).click();await expect(page.locator('.phase-count')).toHaveText('5');
 await expect(page.locator('.session-panel')).toHaveAttribute('aria-busy','false',{timeout:15000});
 await page.getByRole('button',{name:en.advanced,exact:true}).click();await expect(page.getByRole('button',{name:en.preview,exact:true})).toBeDisabled();
 await page.clock.runFor(4990);expect(await page.evaluate(()=>(window as any).notes)).toEqual([]);
 await page.clock.runFor(30);await expect(page.getByRole('heading',{name:en.inhale,exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).notes)).toEqual([392]);
 await page.getByRole('button',{name:en.restart,exact:true}).click();await expect(page.locator('.phase-count')).toHaveText('5');
 await page.getByRole('button',{name:en.stop,exact:true}).click();await page.clock.runFor(10000);await expect(page.locator('.settings-panel')).toBeVisible();expect(await page.evaluate(()=>(window as any).notes)).toEqual([392]);
});
test('settings opacity stays 35 percent while practice uses 80 percent and full-opacity controls',async({page})=>{
 await page.goto('./');expect(await page.locator('.scenery').evaluate(el=>getComputedStyle(el).opacity)).toBe('0.35');
 await page.getByRole('button',{name:en.start,exact:true}).click();await expect(page.locator('.session-panel')).toBeVisible();
 expect(await page.locator('.scenery').evaluate(el=>getComputedStyle(el).opacity)).toBe('0.8');expect(await page.locator('.app-view').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
});
