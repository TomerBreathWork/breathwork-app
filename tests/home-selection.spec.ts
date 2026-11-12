import { test, expect, type Page } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };
const languages = { en, he, ja };
async function open(page: Page, language = 'en', saved: Record<string, unknown> = { sound: 'silent' }) {
  await page.addInitScript(({ language, saved }) => {
    if (!sessionStorage.getItem('home-test-initialized')) {
      localStorage.setItem('breath-flow-language', language);
      localStorage.setItem('still-settings', JSON.stringify(saved));
      sessionStorage.setItem('home-test-initialized', '1');
    }
  }, { language, saved });
  await page.goto('./');
  await expect(page.locator('.settings-panel')).toBeVisible();
}
async function fits(page: Page) {
  const measured = await page.evaluate(() => {
    const app = document.querySelector('.app-page')!;
    const visible = [...document.querySelectorAll<HTMLElement>('.settings-panel button,.settings-panel a,.settings-panel input')].filter(e => e.getClientRects().length);
    return {
      fits: app.scrollHeight <= app.clientHeight + 1 && app.scrollWidth <= app.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth,
      targets: visible.filter(e => e.matches('button,a')).every(e => { const r = e.getBoundingClientRect(); return r.height >= 44 && r.width >= 44; }),
      controls: visible.every(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }),
    };
  });
  expect(measured).toEqual({ fits: true, controls: true, targets: true });
}
for (const [language, t] of Object.entries(languages)) {
  for (const [width, height] of [[320,568],[360,640],[375,667],[390,844],[1280,900]]) {
    test(`${language} ${width}x${height}: chooser and every selected practice fit without scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height }); await open(page, language);
      await expect(page.locator('.home-choices button')).toHaveCount(4);
      await expect(page.locator('.rhythm-grid,.session-length,.start-button')).toHaveCount(0);
      await expect(page.locator('.explore-card-title')).toHaveText(t.exploreMore);
      for (const subtitle of [t.homeCalmBalance,t.homeFocusBalance,t.homeRelaxUnwind,t.homeOwnRhythm]) {
        const label = page.locator('.choice-subtitle').filter({hasText:subtitle});
        await expect(label).toBeVisible();
        expect((await label.boundingBox())!.width).toBeGreaterThan(50);
      }
      await fits(page);
      for (const [id, rhythm] of [['coherent',[5.5,0,5.5,0]],['box',[4,4,4,4]],['478',[4,7,8,0]],['custom',[4,7,8,0]]] as const) {
        await page.locator(`[data-home-choice="${id}"]`).click();
        await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','selected');
        await expect(page.locator('.selected-practice-heading h2')).toBeFocused();
        for (const selector of ['.selected-practice-heading h2', '.choose-another']) {
          expect((await page.locator(selector).boundingBox())!.width).toBeGreaterThan(1);
          if (language === 'ja') {
            for (const label of await page.locator(`${selector} .ja-text-unit`).all()) {
              const box = (await label.boundingBox())!;
              expect(box.width).toBeGreaterThan(1); expect(box.height).toBeGreaterThan(10);
            }
          }
        }
        for (let i=0;i<4;i++) await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(rhythm[i]));
        await expect(page.locator('.selected-explanation')).toBeVisible();
        await expect(page.locator('.start-button')).toBeEnabled();
        await expect(page.locator('[data-retained-advanced]')).toBeHidden();
        await fits(page);
        await page.locator('.choose-another').click();
        await expect(page.locator(`[data-home-choice="${id}"]`)).toBeFocused();
      }
    });
  }
  test(`${language}: no choice survives automatic default save/reload; explicit Box edits restore`,async({page})=>{
    await open(page,language); await page.reload();
    await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','choosing');
    await page.locator('[data-home-choice="box"]').press('Enter');
    await page.locator('#phase-value-1').fill('6.5'); await page.locator('#phase-value-1').blur();
    await page.locator('#duration').fill('5');await page.locator('#duration').blur();
    await page.locator('.choose-another').click();await page.locator('[data-home-choice="box"]').click();
    for(let i=0;i<4;i++)await expect(page.locator(`#phase-value-${i}`)).toHaveValue('6.5');
    await page.reload();
    await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','selected');
    for(let i=0;i<4;i++)await expect(page.locator(`#phase-value-${i}`)).toHaveValue('6.5');
    await expect(page.locator('#duration')).toHaveValue('5');
    await expect(page.locator('.selected-practice-heading h2')).toHaveText(t.boxBreathing);
  });
  test(`${language}: 200% text remains operable, with explicit accessibility scrolling exception`,async({page})=>{
    await page.setViewportSize({width:320,height:568}); await open(page,language);
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');
    for(const el of await page.locator('.home-choices button').all()) { await el.scrollIntoViewIfNeeded();await expect(el).toBeInViewport(); }
    await page.locator('[data-home-choice="custom"]').click();
    await page.locator('#phase-value-1').fill('119.5');await page.locator('#phase-value-1').blur();
    await expect(page.locator('#phase-value-1')).toHaveValue('119.5');
    await page.locator('.start-button').scrollIntoViewIfNeeded();await expect(page.locator('.start-button')).toBeInViewport();
    await page.locator('.choose-another').scrollIntoViewIfNeeded();await expect(page.locator('.choose-another')).toBeInViewport();
  });
}
for(const [id,preset,rhythm] of [['coherent','coherentBreathing',[5.5,0,5.5,0]],['box','boxBreathing',[6,6,6,6]],['478','eveningUnwind',[4,7,8,0]],['custom','custom',[6.5,0,8,1]],['extended','custom',[4.5,0,9,0]]] as const)
 test(`legacy saved ${id} opens selected with exact configuration and secondary preferences`,async({page})=>{
  await open(page,'en',{practiceId:id,preset,rhythm,minutes:7,sound:'silent',volume:.7,audioOutputVersion:1,background:'photo-2',customRhythm:[6.5,0,8,1]});
  await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','selected');
  await expect(page.locator('.settings-panel')).toHaveAttribute('data-selected-practice',id);
  for(let i=0;i<4;i++)await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(rhythm[i]));
  await expect(page.locator('#duration')).toHaveValue('7');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('still-settings')!));
  expect(saved.volume).toBe(.7); expect(saved.sound).toBe('silent'); expect(saved.background).toBe('photo-2');expect(saved.customRhythm).toEqual([6.5,0,8,1]);
 });
test('library and practice return preserve the selected home state; preparation and full-cycle time unchanged',async({page})=>{
 await page.clock.install();await open(page);
 await page.locator('.explore-choice').click();await page.locator('[data-practice="extended"]').click();
 await page.locator('.discovery-back').click();await page.locator('.discovery-back').click();
 await expect(page.locator('.settings-panel')).toHaveAttribute('data-selected-practice','extended');
 await expect(page.locator('.start-button')).toBeEnabled();
 await page.locator('.choose-another').click();await page.locator('[data-home-choice="coherent"]').click();
 await page.locator('.start-button').click();await expect(page.locator('.phase-count')).toHaveText('3');
 await expect(page.locator('.remaining-value')).toHaveText('03:07');
 await page.clock.runFor(3100); await expect(page.locator('.circle-label h2')).toHaveText(en.inhale);
 await page.getByRole('button',{name:en.stop,exact:true}).click();
 await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','selected');
 await expect(page.locator('#phase-value-0')).toHaveValue('5.5');
});
test('Custom memory survives choosing another practice and a reload',async({page})=>{
 await open(page);await page.locator('[data-home-choice="custom"]').click();
 for(const [i,n] of [6.5,1.5,8,0.5].entries()) {await page.locator(`#phase-value-${i}`).fill(String(n));await page.locator(`#phase-value-${i}`).blur();}
 await page.locator('.choose-another').click();await page.locator('[data-home-choice="box"]').click();
 await page.reload();await page.locator('.choose-another').click();await page.locator('[data-home-choice="custom"]').click();
 for(const [i,n] of [6.5,1.5,8,0.5].entries())await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(n));
});
test('restricted storage still permits selection and returning from practice without reset',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage disabled');}}));
 await page.goto('./'); await page.locator('[data-home-choice="box"]').click();
 await page.locator('#phase-value-0').fill('5.5');await page.locator('#phase-value-0').blur();
 await page.locator('.start-button').click();await page.locator('.session-controls button').last().click();
 await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','selected');
 await expect(page.locator('#phase-value-0')).toHaveValue('5.5');
});
for(const [language,t] of Object.entries(languages))test(`${language}: consent stays optional and keyboard focus is unobstructed after selection`,async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('breath-flow-analytics-consent'));
 const googleRequests:string[]=[];page.on('request',r=>{if(/googletagmanager|google-analytics/.test(r.url()))googleRequests.push(r.url());});
 await page.setViewportSize({width:320,height:568});await open(page,language);
 await expect(page.locator('.analytics-notice')).toBeVisible();
 await page.locator('[data-home-choice="coherent"]').press('Enter');
 for(const selector of ['#phase-value-0','#duration','.start-button','.choose-another']){
  await page.locator(selector).focus();
  expect(await page.locator(selector).evaluate(el=>{
    const r=el.getBoundingClientRect(),notice=document.querySelector('.analytics-notice')!.getBoundingClientRect();
    return r.top>=0&&r.bottom<notice.top&&document.activeElement===el;
  })).toBe(true);
 }
 await page.getByRole('button',{name:t.analyticsDecline,exact:true}).click();
 await expect(page.locator('.analytics-notice')).toHaveCount(0);expect(googleRequests).toEqual([]);
 await fits(page);
});
test('initial Coherent choice is tracked once after consent; a reload does not synthesize a selection',async({page})=>{
 await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.route('https://*.google-analytics.com/**',r=>r.abort());
 await page.addInitScript(()=>localStorage.setItem('breath-flow-analytics-consent','granted'));
 await open(page);await page.locator('[data-home-choice="coherent"]').click();
 const selections=()=>page.evaluate(()=>(window.dataLayer??[]).map(v=>Array.from(v as ArrayLike<any>)).filter(([cmd,name])=>cmd==='event'&&name==='practice_selected'));
 await expect.poll(async()=>(await selections()).length).toBe(1);
 expect((await selections())[0][2].practice_id).toBe('coherent');
 await page.locator('#phase-value-0').fill('6');await page.locator('#phase-value-0').blur();
 expect(await selections()).toHaveLength(1);
 await page.reload();expect(await selections()).toHaveLength(0);
});
for (const [language,t] of Object.entries(languages)) test(`${language}: welcoming chooser has a secondary library card and leaves selected controls unchanged`,async({page})=>{
  await page.setViewportSize({width:320,height:568});await open(page,language);
  await expect(page.getByRole('heading',{name:t.homeWelcome,exact:true})).toBeVisible();
  await expect(page.locator('.explore-card-subtitle')).toHaveText(t.homeExploreHint);
  if (language === 'he') {
    await expect(page.locator('.home-welcome')).toHaveText('איזו נשימה מתאימה לך היום?');
    await expect(page.locator('[data-home-choice="custom"] .choice-subtitle')).toHaveText('הקצב שלך');
  }
  if (language === 'ja')
    await expect(page.locator('[data-home-choice="478"] .choice-subtitle')).toHaveText('リラックスと休息');
  for (const [width,height] of [[320,568],[375,667]]) {
    await page.setViewportSize({width,height});
    const headerSpacing = await page.evaluate(() => {
      const panel = document.querySelector('.settings-panel')!.getBoundingClientRect();
      const header = document.querySelector('.home-welcome-header')!.getBoundingClientRect();
      const heading = document.querySelector('.home-welcome')!.getBoundingClientRect();
      const cards = document.querySelector('.home-choices')!.getBoundingClientRect();
      return { above: heading.top-header.top, below: header.bottom-heading.bottom,
        panelInset: header.top-panel.top, cardGap: cards.top-header.bottom };
    });
    expect(headerSpacing.above).toBeGreaterThanOrEqual(24);
    expect(Math.abs(headerSpacing.above-headerSpacing.below)).toBeLessThan(1);
    expect(headerSpacing.panelInset).toBe(1); // Only the existing panel border.
    expect(headerSpacing.cardGap).toBe(0); // No collapsed margins outside the header.
    await fits(page);
  }
  await page.setViewportSize({width:320,height:568});
  const cards=await page.locator('.home-choices button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height};}));
  expect(cards[0].y).toBe(cards[1].y);expect(cards[2].y).toBe(cards[3].y);expect(cards[2].y).toBeGreaterThan(cards[0].y);
  for(const card of cards)expect(card.height).toBeGreaterThanOrEqual(108);
  await fits(page);
  await page.locator('.explore-choice').focus();await page.keyboard.press('Enter');
  await expect(page.locator('.practice-list')).toBeVisible();await page.goBack();
  await expect(page.locator('.home-welcome')).toBeVisible();
  await page.locator('[data-home-choice="coherent"]').click();
  await expect(page.locator('.home-welcome,.explore-card-copy')).toHaveCount(0);
  await expect(page.locator('.explore-choice')).toHaveText(t.exploreMore);
  await fits(page);
});
for(const [language,label] of [['en','Change Practice'],['he','שינוי תרגול'],['ja','呼吸法を変更']])
  test(`${language}: Change Practice is a compact keyboard-operable secondary button`,async({page})=>{
    await page.setViewportSize({width:320,height:568});await open(page,language);
    await expect(page.getByRole('button',{name:label,exact:true})).toHaveCount(0);
    await page.locator('[data-home-choice="coherent"]').click();
    const action=page.getByRole('button',{name:label,exact:true});
    await expect(action).toBeVisible();
    await expect(action.locator('svg')).toHaveAttribute('aria-hidden','true');
    const measured=await action.evaluate(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect(),header=el.parentElement!.getBoundingClientRect();
      const luminance=(color:string)=>{
        const channels=color.match(/[\d.]+/g)!.slice(0,3).map(v=>Number(v)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
        return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
      };
      const text=luminance(s.color),background=luminance(s.backgroundColor);
      return {height:r.height,width:r.width,headerHeight:header.height,
        paintedHeight:r.height-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth),
        clip:s.backgroundClip,contrast:(Math.max(text,background)+.05)/(Math.min(text,background)+.05),
        decoration:s.textDecorationLine,background:s.backgroundColor};
    });
    expect(measured.height).toBe(44);expect(measured.headerHeight).toBe(44);
    expect(measured.width).toBeGreaterThanOrEqual(44);expect(measured.paintedHeight).toBe(32);
    expect(measured.clip).toBe('padding-box');expect(measured.contrast).toBeGreaterThanOrEqual(4.5);
    expect(measured.decoration).toBe('none');expect(measured.background).not.toBe('rgba(0, 0, 0, 0)');
    await page.keyboard.press('Tab');await expect(action).toBeFocused();
    expect(await action.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Space');
    await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','choosing');
    await expect(page.locator('[data-home-choice="coherent"]')).toBeFocused();
    await fits(page);
    // The transparent top edge is still part of the native 44px hit target.
    await page.locator('[data-home-choice="coherent"]').click();
    await action.click({position:{x:10,y:2}});
    await expect(page.locator('.settings-panel')).toHaveAttribute('data-home-state','choosing');
  });
