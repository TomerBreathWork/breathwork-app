import {test,expect} from '@playwright/test';
for(const volume of [1,.4])test(`Bee applies 0.70x to saved volume ${volume} and restores other practices`,async({page})=>{
 await page.addInitScript(volume=>{localStorage.setItem('breath-flow-language','en');localStorage.setItem('breath-flow-analytics-consent','denied');localStorage.setItem('still-settings',JSON.stringify({sound:'bowls',volume,audioOutputVersion:1}));const Native=window.AudioContext;const w=window as any;w.masterTargets=[];window.AudioContext=class extends Native{private first=true;createGain(){const node=super.createGain();if(this.first){this.first=false;const set=node.gain.setTargetAtTime.bind(node.gain);node.gain.setTargetAtTime=(value:number,time:number,constant:number)=>{w.masterTargets.push(value);return set(value,time,constant);};}return node;}};},volume);
 await page.goto('./');await expect.poll(()=>page.evaluate(()=>(window as any).masterTargets.at(-1))).toBe(volume);
 await page.locator('.explore-choice').click();await page.locator('.category-filters button').last().click();await page.locator('[data-practice="bee-breathing"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).masterTargets.at(-1))).toBe(volume*.7);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('still-settings')!).volume)).toBe(volume);
 await page.locator('.discovery-back').click();await page.locator('[data-practice="flower-candle"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).masterTargets.at(-1))).toBe(volume);
 await page.locator('.discovery-back').click();await page.locator('.discovery-back').click();await page.locator('[data-home-choice="coherent"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).masterTargets.at(-1))).toBe(volume);
});
