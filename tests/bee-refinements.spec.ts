import {test,expect} from '@playwright/test';
for(const width of [320,360,375,390])test(`single narration stage and garden at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?568:667});
 await page.addInitScript(()=>{localStorage.setItem('breath-flow-language','he');localStorage.setItem('still-settings',JSON.stringify({sound:'silent'}));const Native=window.Audio;(window as any).voice=[];window.Audio=function(src:string){const a=new Native(src);(window as any).voice.push(a);return a;} as any;HTMLMediaElement.prototype.play=()=>Promise.resolve();});
 await page.goto('./');await page.locator('.explore-choice').click();await page.locator('.category-filters button').last().click();await page.locator('[data-practice="bee-breathing"]').click();await expect(page.locator('.kids-step')).toHaveCount(3);await page.locator('.start-button').click();
 let height=0;
 for(const [at,step]of [[3,'inhale'],[7,'ears'],[13,'hum'],[29,'hum']] as const){
 await page.evaluate(at=>{const a=(window as any).voice.at(-1);Object.defineProperty(a,'currentTime',{value:at,configurable:true});a.dispatchEvent(new Event('timeupdate'));},at);
 await expect(page.locator('.bee-narration-stage')).toHaveAttribute('data-shown-step',step);await page.waitForTimeout(200);
 await expect(page.locator('.kids-step[aria-hidden="false"]')).toHaveCount(1);await expect(page.locator('.kids-step:visible')).toHaveCount(1);
 await expect(page.locator('.kids-step[aria-hidden="false"] image')).toHaveAttribute('clip-path',/url/);
 const box=await page.locator('.bee-narration-stage').boundingBox();if(height)expect(box!.height).toBe(height);height=box!.height;
 expect(await page.locator('.app-page').evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
 }
 await expect(page.locator('.bee-hum-artwork text')).toHaveText('ממממ');
 await page.locator('.kids-narration-playback button').click();await expect(page.locator('.bee-details')).toHaveAttribute('data-narration-paused','true');await expect(page.locator('.bee-narration-stage')).toHaveAttribute('data-shown-step','hum');
 await page.locator('.start-button').click();await expect(page.locator('.phase-count')).toHaveText('3');await page.waitForTimeout(3400);
 const image=await page.locator('.bee-circle .breath-circle').evaluate(n=>getComputedStyle(n).backgroundImage);expect(image).toContain('watercolor-garden');
 const url=image.match(/url\("?([^"\)]+)/)![1];expect((await page.request.get(url)).ok()).toBeTruthy();await expect(page.locator('.bee-flyer')).toBeVisible();
});
