import {test,expect,type Page} from '@playwright/test';
import he from '../src/locales/he.json' with {type:'json'};
import en from '../src/locales/en.json' with {type:'json'};
import ja from '../src/locales/ja.json' with {type:'json'};
import {observeSamples} from './sample-observer';
async function open(page:Page,{language='he',mock=true,disabled=false,sound='silent'}={}){
 await page.addInitScript(({language,mock,disabled,sound})=>{
  localStorage.setItem('breath-flow-language',language);localStorage.setItem('breath-flow-analytics-consent','denied');localStorage.setItem('still-settings',JSON.stringify({sound}));
  if(disabled)localStorage.setItem('breath-flow-flower-candle-introduction',JSON.stringify({version:1,he:{enabled:false,acknowledged:false}}));
  const w=window as any;w.voiceAudios=[];const NativeAudio=window.Audio;
  w.Audio=function(src:string){const audio=new NativeAudio(src);w.voiceAudios.push(audio);return audio;};w.Audio.prototype=NativeAudio.prototype;
  if(mock)HTMLMediaElement.prototype.play=function(){return w.rejectVoice?Promise.reject(new Error('Blocked')):Promise.resolve();};
 },{language,mock,disabled,sound});
 await page.goto('./');await page.locator('.explore-choice').click();await page.locator('.category-filters button').last().click();await page.locator('[data-practice="flower-candle"]').click();await expect(page.locator('.start-button')).toBeEnabled();
}
async function endVoice(page:Page){await page.evaluate(()=>{(window as any).voiceAudios.at(-1).dispatchEvent(new Event('ended'));});}
async function cue(page:Page,time:number){await page.evaluate(time=>{const a=(window as any).voiceAudios.at(-1);Object.defineProperty(a,'currentTime',{value:time,writable:true,configurable:true});a.dispatchEvent(new Event('timeupdate'));},time);}
test('Hebrew first use: recording gates the timer, uses supplied cues and Skip starts only once',async({page})=>{
 await page.clock.install();await page.addInitScript(observeSamples);await open(page,{sound:'recordings'});
 await expect(page.getByLabel(he.kidsVoice)).toBeChecked();await page.locator('.start-button').click();
 await expect(page.getByText(he.kidsNarrationPlaying,{exact:true})).toBeVisible();await page.clock.runFor(12000);
 await expect(page.locator('.session-panel')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(0);
 for(const [time,expected]of [[0,'balanced'],[8,'flower'],[14,'candle'],[23,'balanced']]as const){await cue(page,time);await expect(page.locator('.kids-steps')).toHaveAttribute('data-narration-cue',expected);}
 await page.getByRole('button',{name:he.kidsSkipIntroduction,exact:true}).dblclick();await endVoice(page);
 await expect(page.locator('.phase-count')).toHaveText('3');await page.clock.runFor(3500);await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','flower');
 await expect.poll(()=>page.evaluate(()=>(window as any).sampleAudio.starts.length)).toBe(1);
});
test('natural completion starts preparation; returning Start and standalone Replay have separate behavior',async({page})=>{
 await open(page);await page.locator('.start-button').click();await endVoice(page);await expect(page.locator('.phase-count')).toHaveText('3');
 await page.getByRole('button',{name:he.stop,exact:true}).click();await page.getByRole('button',{name:he.kidsReplayIntroduction,exact:true}).click();await endVoice(page);
 await expect(page.locator('.kids-details')).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.locator('.start-button').click();await expect(page.locator('.phase-count')).toHaveText('3');
 expect(await page.evaluate(()=>(window as any).voiceAudios.length)).toBe(2);
});
test('disabled guidance persists and does not depend on bowl mute',async({page})=>{
 await open(page);await page.getByLabel(he.kidsVoice).uncheck();await page.locator('.start-button').click();await expect(page.locator('.session-panel')).toBeVisible();expect(await page.evaluate(()=>(window as any).voiceAudios.length)).toBe(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('breath-flow-flower-candle-introduction')!).he.enabled)).toBe(false);
});
test('Back and language changes cancel stale ended callbacks without starting',async({page})=>{
 await open(page);await page.locator('.start-button').click();await page.goBack();await endVoice(page);await expect(page.locator('.category-filters')).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.locator('[data-practice="flower-candle"]').click();await page.locator('.start-button').click();await page.locator('.language-picker select').selectOption('ja');await endVoice(page);
 await expect(page.getByLabel(ja.kidsVoice)).toHaveCount(0);await expect(page.locator('.session-panel')).toHaveCount(0);
});
test('backgrounding pauses narration and foregrounding never auto-resumes',async({page})=>{
 await open(page);await page.locator('.start-button').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.getByText(he.kidsNarrationPaused,{exact:true})).toBeVisible();await endVoice(page);await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByText(he.kidsNarrationPaused,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:he.resume,exact:true}).click();await endVoice(page);await expect(page.locator('.phase-count')).toHaveText('3');
});
test('failed playback offers a written-instructions fallback',async({page})=>{
 await open(page);await page.evaluate(()=>(window as any).rejectVoice=true);await page.locator('.start-button').click();await expect(page.getByText(he.kidsNarrationUnavailable,{exact:true})).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.getByRole('button',{name:he.kidsStartWithoutIntroduction,exact:true}).click();await expect(page.locator('.phase-count')).toHaveText('3');
});
test('missing recording fails gracefully without starting the timer',async({page})=>{
 await page.route(url=>url.pathname.includes('miya')&&url.pathname.endsWith('.mp3'),route=>route.fulfill({status:404,body:'Unavailable'}));
 await open(page,{mock:false});await page.locator('.start-button').click();await expect(page.getByText(he.kidsNarrationUnavailable,{exact:true})).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.getByRole('button',{name:he.kidsStartWithoutIntroduction,exact:true}).click();await expect(page.locator('.phase-count')).toHaveText('3');
});
for(const [language,t]of [['en',en],['ja',ja]]as const)test(`${language}: no unavailable voice options and direct Start`,async({page})=>{
 await open(page,{language});await expect(page.getByLabel(t.kidsVoice)).toHaveCount(0);await expect(page.getByRole('button',{name:t.kidsReplayIntroduction,exact:true})).toHaveCount(0);
 await page.locator('.start-button').click();await expect(page.locator('.phase-count')).toHaveText('3');expect(await page.evaluate(()=>(window as any).voiceAudios.length)).toBe(0);
});
for(const [width,height]of [[320,568],[360,640],[375,667],[390,844]])test(`Hebrew ${width}: readable controls and instructions during narration`,async({page})=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await open(page);await page.locator('.start-button').click();await cue(page,8);
 await expect(page.locator('.kids-step').first().locator('.kids-static-art')).toHaveCSS('transform','none');
 for(const step of await page.locator('.kids-step').all()){await step.scrollIntoViewIfNeeded();await expect(step).toBeInViewport({ratio:1});}
 await page.getByRole('button',{name:he.kidsSkipIntroduction,exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:he.kidsSkipIntroduction,exact:true})).toBeInViewport();
 expect(await page.locator('.app-page').evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
});
test('actual unchanged recording decodes and naturally ends before preparation begins',async({page})=>{
 test.setTimeout(45000);await open(page,{mock:false});await page.locator('.start-button').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).voiceAudios.at(-1)?.currentTime??0)).toBeGreaterThan(.1);
 const metadata=await page.evaluate(()=>{const a=(window as any).voiceAudios.at(-1);return {duration:a.duration,src:a.src,canPlay:a.canPlayType('audio/mpeg')};});
 expect(metadata.duration).toBeGreaterThan(25);expect(metadata.duration).toBeLessThan(26);expect(metadata.canPlay).not.toBe('');
 await expect(page.locator('.session-panel')).toHaveCount(0);await expect(page.locator('.phase-count')).toHaveText('3',{timeout:30000});
});
