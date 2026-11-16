import { test, expect } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };
const locales = { en, he, ja };
async function open(page: import('@playwright/test').Page, lang='en') {
  await page.addInitScript(lang=>{
    localStorage.setItem('breath-flow-flower-candle-introduction',JSON.stringify({version:1,he:{enabled:false,acknowledged:false}}));
    localStorage.setItem('breath-flow-language',lang);
    localStorage.setItem('still-settings',JSON.stringify({preset:'boxBreathing',practiceId:'box',rhythm:[6,6,6,6],minutes:5,sound:'silent',volume:.4}));
  },lang);
  await page.goto('./?prototype=flower-candle');
}
for(const [lang,t] of Object.entries(locales)) for(const [width,height] of [[320,568],[360,640],[375,667],[390,844]]) {
  test(`${lang} ${width}: localized setup and both phases fit mobile`,async({page})=>{
    await page.setViewportSize({width,height});await page.clock.install();await open(page,lang);
    await expect(page.locator('.kids-details h2')).toHaveText(t.kidsTitle);
    await page.locator('.kids-practice-settings summary').click();
    await expect(page.locator('#kids-inhale')).toHaveValue('2');
    await expect(page.locator('#duration')).toHaveValue('1');
    await page.locator('.start-button').click();await page.clock.runFor(3500);
    await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','flower');
    await expect(page.locator('.phase-guidance')).toContainText(t.kidsInhale);
    expect(await page.locator('.phase-guidance').evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThan(30);
    await fits(page);
    await page.clock.runFor(2000);
    await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','candle');
    await expect(page.locator('.phase-guidance')).toContainText(t.kidsExhale);
    await fits(page);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('still-settings')!));
    expect(saved.rhythm).toEqual([6,6,6,6]);expect(saved.minutes).toBe(5);
  });
}
async function fits(page: import('@playwright/test').Page) {
  const size=await page.locator('.app-page').evaluate(n=>({w:n.clientWidth,sw:n.scrollWidth,h:n.clientHeight,sh:n.scrollHeight}));
  expect(size.sw).toBeLessThanOrEqual(size.w+1);expect(size.sh).toBeLessThanOrEqual(size.h+1);
  const bottom=await page.locator('.session-controls').evaluate(n=>n.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));
}
for(const inhale of [1,2,3,4,5,6]) test(`${inhale}: ratio, flame, pause/resume, restart and Back safeguards`,async({page})=>{
  await page.clock.install();await open(page);
  await page.locator('.kids-practice-settings summary').click();
  await page.locator('#kids-inhale').focus(); await page.keyboard.press('Home');
  for(let n=1;n<inhale;n++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('.kids-ratio')).toContainText(String(inhale*2));
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+60000));
  await page.locator('.start-button').click();await page.clock.runFor(3100+inhale*1000);
  await expect(page.locator('.kids-circle')).toHaveAttribute('data-art','candle');
  await page.clock.runFor(inhale*2000 - 1400);
  const flame=page.locator('.kids-flame');
  expect(Number(await flame.evaluate(n=>getComputedStyle(n).opacity))).toBeGreaterThan(.9);
  await page.getByRole('button',{name:en.pause,exact:true}).click();
  const frozen=await flame.getAttribute('style');await page.clock.runFor(5000);expect(await flame.getAttribute('style')).toBe(frozen);
  await page.getByRole('button',{name:en.resume,exact:true}).click();
  await page.clock.runFor(800);
  await expect(flame).toHaveCSS('opacity','0');
  await page.goBack();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:en.stayInPractice,exact:true}).click();
  await expect(page.getByRole('button',{name:en.resume,exact:true})).toBeVisible();
  await page.getByRole('button',{name:en.restart,exact:true}).click();
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','preparation');
  await expect(page.locator('.phase-count')).toHaveText('3');
  await page.getByRole('button',{name:en.stop,exact:true}).click();
  await expect(page.locator('.kids-details')).toBeVisible();
  await expect(page.locator('.kids-details')).toBeFocused();
});
test('text introduction has no narration controls; reduced motion and enlarged text stay operable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await open(page,'ja');
  await expect(page.getByLabel(ja.kidsVoice)).toHaveCount(0);await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.locator('.kids-steps')).toContainText(ja.kidsStep1Body);
  await page.locator('.start-button').click();await page.clock.runFor(3500);
  await expect(page.locator('.kids-flower')).toHaveCSS('transform','none');
  await page.addStyleTag({content:'html{font-size:32px!important}'});
  await expect(page.getByRole('button',{name:ja.pause,exact:true})).toBeEnabled();
});

test('one-minute request completes a full 63-second cycle boundary at 3 / 6',async({page})=>{
  await page.clock.install();await open(page);
  await page.locator('.kids-practice-settings summary').click();
  await page.locator('#kids-inhale').focus();await page.keyboard.press('Home');
  for(let i=0;i<2;i++)await page.keyboard.press('ArrowRight');
  await page.locator('.start-button').click();
  await expect(page.locator('.remaining-value')).toHaveText('01:03');
  await page.clock.fastForward(66000);
  await page.clock.runFor(32);
  await expect(page.locator('.kids-details')).toBeVisible();
  await expect(page.locator('.session-panel')).toHaveCount(0);
  await expect(page.locator('.kids-illustration')).toHaveCount(0);
});
