import {test,expect,type Page} from '@playwright/test';
import {observeSamples} from './sample-observer';
import en from '../src/locales/en.json' with {type:'json'};
async function open(page:Page,language='en',sound='bowls',voice=false){
 await page.addInitScript(observeSamples);
 await page.addInitScript(({language,sound,voice})=>{localStorage.setItem('breath-flow-language',language);localStorage.setItem('breath-flow-analytics-consent','denied');localStorage.setItem('still-settings',JSON.stringify({sound,volume:1,audioOutputVersion:1}));if(!voice)localStorage.setItem('breath-flow-bee-introduction',JSON.stringify({version:1,he:{enabled:false}}));
 const w=window as any;w.probes=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination:any,...args:any[]){const result=(connect as any).call(this,destination,...args);if(destination===this.context.destination){const analyser=this.context.createAnalyser(),sink=this.context.createMediaStreamDestination();analyser.fftSize=2048;(connect as any).call(this,analyser);(connect as any).call(analyser,sink);w.probes.push(analyser);}return result;};
 },{language,sound,voice});
 await page.goto('./');await page.locator('.explore-choice').click();await page.locator('.category-filters button').last().click();await page.locator('[data-practice="bee-breathing"]').click();
}
const starts=(page:Page)=>page.evaluate(()=>(window as any).sampleAudio.starts);
const rms=(page:Page)=>page.evaluate(()=>Math.max(0,...(window as any).probes.map((a:AnalyserNode)=>{const f=new Float32Array(a.fftSize);a.getFloatTimeDomainData(f);return Math.sqrt(f.reduce((sum,v)=>sum+v*v,0)/f.length);})));
test('real default bowl output: silent preparation, high inhale, low exhale, mute/unmute, pause/resume, restart and stop',async({page})=>{
 await open(page);await page.locator('.start-button').click();await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','preparation');await page.waitForTimeout(1000);expect(await starts(page)).toHaveLength(0);
 await expect.poll(async()=> (await starts(page)).length).toBe(1);expect((await starts(page))[0].url).toContain('high_F4_349Hz.mp3');await expect.poll(()=>rms(page)).toBeGreaterThan(.001);
 await expect.poll(async()=> (await starts(page)).length).toBe(2);expect((await starts(page))[1].url).toContain('low_F3_174Hz.mp3');await expect.poll(()=>rms(page)).toBeGreaterThan(.001);
 await page.locator('.practice-mute').click();await page.waitForTimeout(60);await expect.poll(()=>rms(page)).toBeLessThan(.0001);const mutedCount=(await starts(page)).length;await page.waitForTimeout(5200);expect(await starts(page)).toHaveLength(mutedCount);
 await page.locator('.practice-mute').click();await page.waitForTimeout(150);expect(await starts(page)).toHaveLength(mutedCount);await expect.poll(async()=> (await starts(page)).length,{timeout:6000}).toBe(mutedCount+1);
 await page.getByRole('button',{name:en.pause,exact:true}).click();const water=await page.locator('.water').getAttribute('style');const count=(await starts(page)).length;await page.waitForTimeout(600);expect(await starts(page)).toHaveLength(count);expect(await page.locator('.water').getAttribute('style')).toBe(water);
 await page.getByRole('button',{name:en.resume,exact:true}).click();await page.waitForTimeout(100);const resumed=(await starts(page)).slice(count);expect(resumed.every((v:any)=>v.offset>0)).toBeTruthy();
 await page.getByRole('button',{name:en.restart,exact:true}).click();const restarting=(await starts(page)).length;await page.waitForTimeout(1000);expect(await starts(page)).toHaveLength(restarting);await expect.poll(async()=> (await starts(page)).length,{timeout:4000}).toBe(restarting+1);
 await page.getByRole('button',{name:en.stop,exact:true}).click();const stopped=(await starts(page)).length;await page.waitForTimeout(500);expect(await starts(page)).toHaveLength(stopped);
});
test('saved silence stays respected and unmute enables future cues without a missed strike',async({page})=>{
 await open(page,'en','silent');await page.locator('.start-button').click();await page.waitForTimeout(3800);expect(await starts(page)).toHaveLength(0);await page.locator('.practice-mute').click();await page.waitForTimeout(150);expect(await starts(page)).toHaveLength(0);await expect.poll(async()=> (await starts(page)).length,{timeout:4000}).toBe(1);expect((await starts(page))[0].url).toContain('low_F3_174Hz.mp3');
});
test('Hebrew narration produces no bowl sources; Skip leads to separate silent preparation',async({page})=>{
 await page.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.resolve();});await open(page,'he','bowls',true);await page.locator('.start-button').click();await expect(page.locator('.bee-narration-stage')).toBeVisible();await page.waitForTimeout(800);expect(await starts(page)).toHaveLength(0);await page.locator('.start-button').click();await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','preparation');await page.waitForTimeout(800);expect(await starts(page)).toHaveLength(0);await expect.poll(async()=> (await starts(page)).length,{timeout:4000}).toBe(1);
});
for(const language of ['he','en','ja'])for(const width of [320,375])test(`${language} ${width}: engine-driven water rises, falls and freezes with reduced motion`,async({page})=>{
 await page.setViewportSize({width,height:width===320?568:667});await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await open(page,language,'silent');await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+60000));await page.locator('.start-button').click();await page.clock.runFor(3300);
 const height=()=>page.locator('.water').evaluate(n=>parseFloat((n as HTMLElement).style.height));const low=await height();await page.clock.runFor(2400);expect(await height()).toBeGreaterThan(low+60);await page.clock.runFor(600);await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','2');const high=await height();await page.clock.runFor(4000);expect(await height()).toBeLessThan(high-60);
 await page.locator('.primary-control').click();const frozen=await height();await page.clock.runFor(2000);expect(await height()).toBe(frozen);expect(await page.locator('.wave').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');expect(await page.locator('.water-clip').evaluate(n=>getComputedStyle(n).opacity)).toBe('0.65');
 expect(await page.locator('.app-page').evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
});
for(const [inhale,exhale]of [[2,4],[6,12]])test(`${inhale}/${exhale}: water follows normalized phase progress with normal motion`,async({page})=>{
 await page.clock.install();await open(page,'en','silent');await page.locator('.kids-practice-settings summary').click();for(const [id,value]of [['bee-phase-0',inhale],['bee-phase-2',exhale]] as const){const input=page.locator(`#${id}`);await input.focus();await page.keyboard.press(value===2||value===4?'Home':'End');}
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+60000));await page.locator('.start-button').click();await page.clock.runFor(3000+inhale*500);await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','0');let level=await page.locator('.water').evaluate(n=>parseFloat((n as HTMLElement).style.height));expect(Math.abs(level-50)).toBeLessThan(1);
 await page.clock.runFor((inhale+exhale)*500);await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','2');level=await page.locator('.water').evaluate(n=>parseFloat((n as HTMLElement).style.height));expect(Math.abs(level-50)).toBeLessThan(1);
 await page.locator('.primary-control').click();const frozen=await page.locator('.water').getAttribute('style');await page.clock.runFor(1000);expect(await page.locator('.water').getAttribute('style')).toBe(frozen);await page.locator('.primary-control').click();await page.clock.runFor(500);expect(await page.locator('.water').evaluate(n=>parseFloat((n as HTMLElement).style.height))).toBeLessThan(level);
});
