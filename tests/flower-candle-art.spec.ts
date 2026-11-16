import { test, expect, type Page } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };

async function begin(page: Page, inhale=2, language="en") {
  await page.clock.install({ time:new Date('2026-01-01T00:00:00Z') });
  await page.addInitScript(language=>{
    localStorage.setItem('breath-flow-flower-candle-introduction',JSON.stringify({version:1,he:{enabled:false,acknowledged:false}}));
    localStorage.setItem('breath-flow-language',language);
    localStorage.setItem('still-settings',JSON.stringify({sound:'silent'}));
  },language);
  await page.goto('./?prototype=flower-candle');
  await page.locator('.kids-practice-settings summary').click();
  await page.locator('#kids-inhale').focus();await page.keyboard.press('Home');
  for(let i=1;i<inhale;i++)await page.keyboard.press('ArrowRight');
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await page.locator('.start-button').click();await page.clock.runFor(3000+inhale*1000);
  await page.locator('.kids-illustration img').evaluateAll(async images=>Promise.all(images.map(i=>(i as HTMLImageElement).decode())));
}
async function aligned(page: Page) {
  const result=await page.locator('.kids-candle').evaluate(node=>{
    const body=node.querySelector('.kids-candle-body')!.getBoundingClientRect();
    const flame=node.querySelector('.kids-flame')!.getBoundingClientRect();
    return {dx:Math.abs(body.x+body.width*180/345-(flame.x+flame.width*130/420)),
      dy:Math.abs(body.y+body.height*24/444-(flame.y+flame.height*330/420)),
      decoded:[...node.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)};
  });
  expect(result.dx).toBeLessThan(.3);expect(result.dy).toBeLessThan(.3);expect(result.decoded).toBe(true);
}
const cases = [1,2,3,4,5,6].flatMap(inhale =>
  [[320,568],[360,640],[375,667],[390,844]].map(([width,height])=>[inhale,width,height]));

for(const [inhale,width,height] of cases) {
 test(`${inhale}:${inhale*2}, ${width}px: registered flame stages and final-second smoke`,async({page})=>{
  await page.setViewportSize({width,height});await begin(page,inhale);
  await expect(page.locator('.kids-flame-stage')).toHaveCount(5);
  expect(await page.evaluate(()=>CSS.supports('mix-blend-mode','plus-lighter'))).toBe(true);
  let progress=0;
  for(const p of [...new Set([.1,.335,.55,.745,.90,.97, 1-1.25/(inhale*2), 1-.9/(inhale*2), 1-.5/(inhale*2), 1-.1/(inhale*2)])].sort((a,b)=>a-b)) {
    await page.clock.runFor((p-progress)*inhale*2000);progress=p;
    await aligned(page);
    const layers=await page.locator('.kids-flame-stage').evaluateAll(nodes=>nodes.map(n=>Number((n as HTMLElement).style.opacity)));
    expect(layers.filter(x=>x>0).length).toBeLessThanOrEqual(2);
    expect(layers.reduce((a,b)=>a+b,0)).toBeCloseTo(1,5);
    const flame=Number(await page.locator('.kids-flame').evaluate(n=>getComputedStyle(n).opacity));
    const smoke=Number(await page.locator('.kids-smoke').evaluate(n=>getComputedStyle(n).opacity));
    const remaining=(1-p)*inhale*2;
    if(remaining>1.22){expect(flame).toBe(1);expect(smoke).toBe(0);}
    if(remaining<.98){expect(flame).toBe(0);expect(smoke).toBeGreaterThan(.3);}
  }
  const size=await page.locator('.app-page').evaluate(n=>({w:n.clientWidth,sw:n.scrollWidth,h:n.clientHeight,sh:n.scrollHeight}));
  expect(size.sw).toBeLessThanOrEqual(size.w+1);expect(size.sh).toBeLessThanOrEqual(size.h+1);
 });
}
test('Pause freezes all layers and water, Resume continues, Restart returns to flower',async({page})=>{
  await begin(page);await page.clock.runFor(3500);
  await page.getByRole('button',{name:en.pause,exact:true}).click();
  const styles=()=>page.locator('.kids-illustration [style], .water').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('style')));
  const frozen=await styles();await page.clock.runFor(9000);expect(await styles()).toEqual(frozen);
  await page.getByRole('button',{name:en.resume,exact:true}).click();
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-status','running');
  await page.clock.runFor(120);expect(await styles()).not.toEqual(frozen);await aligned(page);
  await page.getByRole('button',{name:en.restart,exact:true}).click();await expect(page.locator('.kids-illustration')).toHaveCount(0);
  await page.clock.runFor(3400);await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','flower');
  await expect(page.locator('.kids-flame')).toHaveCSS('opacity','0');
});
test('reduced motion uses one upright painting while preserving extinguishing',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await begin(page);await page.clock.runFor(3000);
  await expect(page.locator('.kids-flame-stage').first()).toHaveCSS('transform','none');
  await expect(page.locator('.kids-flame-stage').first()).toHaveCSS('opacity','1');
  for(let i=1;i<5;i++)await expect(page.locator('.kids-flame-stage').nth(i)).toHaveCSS('display','none');
  await page.clock.runFor(880);await expect(page.locator('.kids-flame')).toHaveCSS('opacity','0');
  await expect(page.locator('.kids-smoke')).toHaveCSS('transform','none');
  expect(Number(await page.locator('.kids-smoke').evaluate(n=>getComputedStyle(n).opacity))).toBeGreaterThan(.3);
});

for(const language of ['he','en','ja']) for(const [width,height] of [[320,568],[375,667]]) {
 test(`${language} ${width}: balanced candle, readable water and clear mobile labels`,async({page})=>{
  await page.setViewportSize({width,height});
  await begin(page,2,language);await page.clock.runFor(400);
  await aligned(page);
  const geometry=await page.evaluate(()=>{
   const box=(s:string)=>document.querySelector(s)!.getBoundingClientRect();
   const body=box('.kids-candle-body'),flame=box('.kids-flame'),title=box('.circle-label h2'),count=box('.phase-count');
   const app=document.querySelector('.app-page')!;
   return {aspect:body.width/body.height,
    titleGap:flame.top-title.bottom,countGap:count.top-body.bottom,
    dir:app.getAttribute('dir'),scrollX:app.scrollWidth-app.clientWidth,scrollY:app.scrollHeight-app.clientHeight};
  });
  expect(geometry.aspect).toBeCloseTo(345/444,3);
  expect(geometry.titleGap).toBeGreaterThan(.5);expect(geometry.countGap).toBeGreaterThan(2);
  expect(geometry.dir).toBe(language==='he'?'rtl':'ltr');expect(geometry.scrollX).toBeLessThanOrEqual(1);expect(geometry.scrollY).toBeLessThanOrEqual(1);
  for(const selector of ['.water-clip','.wave']) {
    const opacity=await page.locator(selector).evaluate(n=>Number(getComputedStyle(n).opacity));
    expect(opacity).toBeGreaterThan(0);expect(opacity).toBeLessThan(1);
  }
 });
}
