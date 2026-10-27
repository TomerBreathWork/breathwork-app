import { test, expect } from "@playwright/test";
import en from "../src/locales/en.json" with { type: "json" };
import he from "../src/locales/he.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`group 1 ${language}: help attention is seen once and safety remains accessible`, async ({ page }) => {
    await page.addInitScript(language => {
      localStorage.setItem("breath-flow-language", language);
      if (!localStorage.getItem("still-settings")) localStorage.setItem("still-settings", JSON.stringify({ sound: "silent" }));
    }, language);
    await page.goto("./");
    const help = page.getByRole("button", { name: t.howToUse, exact: true });
    await expect(help).toHaveClass(/help-attention/);
    expect(await help.evaluate(el => getComputedStyle(el).animationName)).toBe("help-attention");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await help.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    await help.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".help-safety h3")).toHaveText(t.helpSafetyTitle);
    for (const paragraph of t.helpSafetyBody.split("\n\n")) await expect(dialog.getByText(paragraph, { exact: true })).toHaveCount(1);
    expect(await dialog.evaluate(el => getComputedStyle(el).direction)).toBe(language === "he" ? "rtl" : "ltr");
    await expect(dialog.getByText(t.helpAdjustBody.split("\n\n")[0], { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
    await expect(help).not.toHaveClass(/help-attention/);
    await page.reload();
    await expect(help).not.toHaveClass(/help-attention/);
    await help.click(); await page.getByRole("button", { name: t.close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`group 2 ${language}: Energy is hidden and Box is exclusively Focus`, async ({ page }) => {
    await page.addInitScript(language => { localStorage.setItem("breath-flow-language", language); localStorage.setItem("still-settings", JSON.stringify({ sound: "silent" })); }, language);
    await page.goto("./");
    await page.locator('[data-home-choice="explore"]').click();
    await expect(page.locator(".category-filters button")).toHaveText([t.allPractices, t.categoryCalm, t.categoryFocus]);
    await expect(page.getByRole("button", { name: t.categoryEnergy, exact: true })).toHaveCount(0);
    await expect(page.locator(".practice-card")).toHaveCount(5);
    await page.getByRole("button", { name: t.categoryCalm, exact: true }).click();
    await expect(page.locator('[data-practice="box"]')).toHaveCount(0);
    await page.getByRole("button", { name: t.categoryFocus, exact: true }).click();
    await expect(page.locator('[data-practice="box"]')).toBeVisible();
    await page.locator('[data-practice="box"]').click();
    await expect(page.locator(".suggested-rhythm bdi")).toHaveText("4 / 4 / 4 / 4");
  });
}

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`group 3 ${language}: selected pattern previews real timings and Advanced stays hidden`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-27T12:00:01Z"));
    await page.addInitScript(language => { localStorage.setItem("breath-flow-language", language); localStorage.setItem("still-settings", JSON.stringify({ sound: "silent" })); }, language);
    await page.goto("./");
    for (const viewport of [{width:320,height:568},{width:360,height:640},{width:375,height:812},{width:390,height:844}]) {
      await page.setViewportSize(viewport);
      const bounds=await page.locator('.app-page').evaluate(el=>({h:el.clientHeight,sh:el.scrollHeight,w:el.clientWidth,sw:el.scrollWidth}));
      expect(bounds.sw).toBe(bounds.w); expect(bounds.sh).toBeLessThanOrEqual(bounds.h+1);
    }
    await expect(page.getByRole('button',{name:t.advanced,exact:true})).toHaveCount(0);
    await expect(page.getByRole('slider',{name:t.volume,exact:true})).toHaveCount(0);
    await expect(page.locator('.selected-explanation')).toHaveText(t.coherentShort);
    await expect(page.locator('.pattern-track')).toHaveAttribute('data-cycle-ms','11000');
    expect(await page.locator('.pattern-track span').evaluate(el=>getComputedStyle(el).animationDuration)).toBe('11s');
    await page.locator('[data-home-choice="box"]').click();
    await expect(page.locator('.selected-explanation')).toHaveText(t.boxShort);
    await expect(page.locator('.pattern-track')).toHaveAttribute('data-cycle-ms','16000');
    for (const [time, expected] of [[2000,0.5],[5000,1],[9000,0.75],[14000,0]]) {
      const fill = await page.locator('.pattern-track span').evaluate((el, time) => {
        const animation = el.getAnimations()[0]; animation.pause(); animation.currentTime = time;
        return new DOMMatrix(getComputedStyle(el).transform).a;
      }, time);
      expect(fill).toBeCloseTo(expected, 2);
    }
    await expect(page.locator('.pattern-rhythm > span')).toHaveCount(5); // Four real phases and the seconds unit.
    await page.locator('#phase-value-0').fill('5.5'); await page.locator('#phase-value-0').blur();
    await expect(page.locator('.pattern-track')).toHaveAttribute('data-cycle-ms','17500');
    await page.emulateMedia({reducedMotion:'reduce'});
    expect(await page.locator('.pattern-track span').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
    await page.locator('.start-button').click();
    await expect(page.locator('.session-panel')).toBeVisible();
    await expect(page.getByRole('button',{name:t.advanced,exact:true})).toHaveCount(0);
    await expect(page.getByRole('combobox',{name:t.background,exact:true})).toHaveCount(0);
    await expect(page.locator('[data-retained-advanced] .advanced-toggle')).toHaveCount(1);
  });
}

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`group 4 ${language}: three silent seconds and mute keep the real session clock intact`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-27T12:00:01Z"));
    await page.addInitScript(language => {
      localStorage.setItem("breath-flow-language", language);
      localStorage.setItem("still-settings", JSON.stringify({ sound: "bowls", volume: 0.15, background: "photo-3" }));
      const Native = window.AudioContext;
      (window as any).audioStarts = [];
      (window as any).audioStops = 0;
      window.AudioContext = class extends Native {
        createBufferSource() {
          const source = super.createBufferSource(), start = source.start.bind(source), stop = source.stop.bind(source);
          source.start = (...args) => { (window as any).audioStarts.push(args[1] ?? 0); start(...args); };
          source.stop = (...args) => { (window as any).audioStops++; stop(...args); };
          return source;
        }
      };
    }, language);
    await page.goto("./");
    await expect(page.locator('.start-button')).toHaveText(t.start, {timeout:15000});
    await page.locator('.start-button').click();
    await expect(page.locator('.session-panel')).toHaveAttribute('aria-busy','false',{timeout:15000});
    const mute = page.locator('.practice-mute');
    await expect(page.locator('.phase-count')).toHaveText('3');
    await expect(mute).toHaveAttribute('aria-label',t.mute);
    await mute.click(); await expect(mute).toHaveAttribute('aria-pressed','true');
    await mute.click(); await expect(mute).toHaveAttribute('aria-pressed','false');
    await page.clock.runFor(2990);
    expect(await page.evaluate(()=>(window as any).audioStarts)).toEqual([]);
    await expect(page.locator('.remaining-value')).toHaveText('03:07');
    await page.clock.runFor(530);
    await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','0');
    const snapshot = async () => ({ timer: await page.locator('.remaining-value').innerText(), water: await page.locator('.water').getAttribute('style'), count: await page.locator('.phase-count').innerText() });
    const before = await snapshot();
    await mute.click();
    await expect(mute).toHaveAttribute('aria-label',t.unmute);
    expect(await snapshot()).toEqual(before);
    const starts = await page.evaluate(()=>(window as any).audioStarts.length);
    expect(await page.evaluate(()=>(window as any).audioStops)).toBeGreaterThan(0);
    await page.clock.runFor(2000);
    expect((await snapshot()).water).not.toBe(before.water);
    expect(await page.evaluate(()=>(window as any).audioStarts.length)).toBe(starts);
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed','false');
    expect(await page.evaluate(()=>(window as any).audioStarts.at(-1))).toBeGreaterThan(2);
    await page.getByRole('button',{name:t.pause,exact:true}).click();
    const paused = await snapshot();
    const pausedStarts = await page.evaluate(()=>(window as any).audioStarts.length);
    await mute.click(); await mute.click(); await page.clock.runFor(4000);
    expect(await snapshot()).toEqual(paused);
    expect(await page.evaluate(()=>(window as any).audioStarts.length)).toBe(pausedStarts);
    await page.getByRole('button',{name:t.resume,exact:true}).click();
    await page.getByRole('button',{name:t.stop,exact:true}).click();
    const stoppedStarts = await page.evaluate(()=>(window as any).audioStarts.length);
    await page.clock.runFor(15000);
    expect(await page.evaluate(()=>(window as any).audioStarts.length)).toBe(stoppedStarts);
    await expect(page.locator('.settings-panel')).toBeVisible();
  });
}

test('group 5 Japanese: meaningful units fit compact controls without changing the text', async ({ page }) => {
  await page.addInitScript(()=>{localStorage.setItem('breath-flow-language','ja');localStorage.setItem('still-settings',JSON.stringify({sound:'silent'}));});
  await page.goto('./');
  for (const viewport of [{width:320,height:568},{width:360,height:640},{width:375,height:812},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.presets button')).toHaveText([ja.coherentBreathing,ja.boxBreathing,ja.preset478,ja.custom]);
    await expect(page.locator('.presets .ja-text-unit').filter({hasText:/^コヒーレント$/})).toHaveCount(1);
    await expect(page.locator('.footer-actions .ja-text-unit').filter({hasText:/^お問い合わせ$/})).toHaveCount(1);
    for (const unit of await page.locator('button .ja-text-unit,.footer-action .ja-text-unit').all()) {
      const dimensions=await unit.evaluate(el=>({width:el.getBoundingClientRect().width,parent:el.parentElement!.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth,font:parseFloat(getComputedStyle(el).fontSize)}));
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.font).toBeGreaterThanOrEqual(8.5);
      expect(dimensions.width).toBeLessThanOrEqual(dimensions.parent+1);
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client+1);
    }
    expect(await page.locator('.app-page').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
    await page.locator('[data-home-choice="explore"]').click();
    await expect(page.locator('.category-filters button')).toHaveText([ja.allPractices,ja.categoryCalm,ja.categoryFocus]);
    const clips=await page.locator('.category-filters button,.practice-card strong .compact-ja-label').evaluateAll(els=>els.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent));
    expect(clips).toEqual([]);
    await page.locator('[data-practice="478"]').click();
    await expect(page.locator('.practice-details > .start-button')).toHaveText(ja.start);
    await page.locator('.discovery-back').click();await page.locator('.discovery-back').click();
  }
  await page.locator('.start-button').click();
  await expect(page.getByRole('heading',{name:ja.preparationInstruction,exact:true})).toBeVisible();
  await page.getByRole('button',{name:ja.stop,exact:true}).click();
  await page.locator('.language-picker select').selectOption('he');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.locator('.compact-ja-label')).toHaveCount(0);
  await page.locator('.language-picker select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('dir','ltr');
  await expect(page.locator('.presets button')).toHaveText([en.coherentBreathing,en.boxBreathing,en.preset478,en.custom]);
});
