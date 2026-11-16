import {test,expect} from '@playwright/test';
for(const language of ['he','en','ja']) for(const [width,height] of [[320,568],[360,640],[375,667],[390,844]]) {
 test(`${language} ${width}: expanded instructions keep their full height and controls remain reachable`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.addInitScript(language=>{localStorage.setItem('breath-flow-language',language);localStorage.setItem('breath-flow-analytics-consent','denied');},language);
  await page.goto('./?prototype=flower-candle');
  const verify=async()=>{
   const layout=await page.locator('.kids-intro-content').evaluate(n=>{
    const children=[...n.children].map(n=>n.getBoundingClientRect());
    const steps=[...n.querySelectorAll('.kids-step')].map(n=>({rect:n.getBoundingClientRect().toJSON(),height:n.clientHeight,scroll:n.scrollHeight}));
    return {overlap:children.slice(1).some((b,i)=>b.top<children[i].bottom-1),steps,width:n.clientWidth,scrollWidth:n.scrollWidth};
   });
   expect(layout.overlap).toBe(false);expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width+1);
   if(language==='ja') {
    for(const heading of await page.locator('.kids-step h3').all()) {
     const box=await heading.evaluate(n=>{
      const style=getComputedStyle(n),label=n.firstElementChild!.getBoundingClientRect();
      const rect=n.getBoundingClientRect();
      return {height:rect.height,lineHeight:parseFloat(style.lineHeight),weight:Number(style.fontWeight),unitFonts:[...n.querySelectorAll(".ja-text-unit")].map(unit=>parseFloat(getComputedStyle(unit).fontSize)),right:label.right,edge:rect.right};
     });
     expect(box.height).toBeLessThanOrEqual(box.lineHeight+2);
     for(const font of box.unitFonts)expect(font).toBeGreaterThanOrEqual(14);
     expect(box.weight).toBeGreaterThanOrEqual(600);expect(box.right).toBeLessThanOrEqual(box.edge+1);
    }
    for(const body of await page.locator('.kids-step p').all())expect(await body.evaluate(n=>getComputedStyle(n).fontSize)).toBe('15.2px');
   }
   for(const step of layout.steps)expect(step.scroll).toBeLessThanOrEqual(step.height+1);
   for(const step of await page.locator('.kids-step').all()){
    await step.scrollIntoViewIfNeeded();await expect(step).toBeInViewport({ratio:1});
   }
   await page.locator('.start-button').scrollIntoViewIfNeeded();await expect(page.locator('.start-button')).toBeInViewport({ratio:1});
  };
  await verify();await page.locator('.kids-practice-settings summary').click();await verify();
  await page.locator('#kids-inhale').scrollIntoViewIfNeeded();await expect(page.locator('#kids-inhale')).toBeInViewport();
  await page.locator('#duration').scrollIntoViewIfNeeded();await expect(page.locator('#duration')).toBeInViewport();
  await page.locator('.kids-practice-settings summary').click();await verify();
 });
}
for(const language of ['he','en','ja']) test(`${language}: enlarged text can scroll to instructions and Start`,async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.addInitScript(language=>{localStorage.setItem('breath-flow-language',language);localStorage.setItem('breath-flow-analytics-consent','denied');},language);
 await page.goto('./?prototype=flower-candle');await page.addStyleTag({content:'html{font-size:32px!important}'});
 await page.locator('.kids-practice-settings summary').click();
 for(const label of await page.locator('.kids-step h3,.kids-step p').all()){await label.scrollIntoViewIfNeeded();await expect(label).toBeInViewport();}
 await page.locator('#duration').scrollIntoViewIfNeeded();await expect(page.locator('#duration')).toBeInViewport();
 await page.locator('.start-button').scrollIntoViewIfNeeded();await expect(page.locator('.start-button')).toBeInViewport();
 expect(await page.locator('.app-page').evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
});
