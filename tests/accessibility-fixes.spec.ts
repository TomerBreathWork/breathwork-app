import { test, expect, type Page } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };

test.use({ storageState: { cookies: [], origins: [] } });
const sizes = [[320, 568], [360, 640], [375, 812], [390, 844], [1280, 900]] as const;
async function open(page: Page, language: string, consent?: string) {
  await page.addInitScript(({ language, consent }) => {
    localStorage.setItem('breath-flow-language', language);
    if (consent) localStorage.setItem('breath-flow-analytics-consent', consent);
    localStorage.setItem('still-settings', JSON.stringify({ preset: 'custom', practiceId: 'custom', rhythm: [5.5, 0, 5.5, 0], minutes: 3, sound: 'silent' }));
  }, { language, consent });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://*.google-analytics.com/**', route => route.abort());
  await page.goto('./');
  await page.locator('[data-home-choice="custom"]').click();
  await expect(page.locator('.start-button')).toBeEnabled();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.app-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
}
async function visibleFocus(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    if (!el || el === document.body) return true;
    const r = el.getBoundingClientRect();
    // Wrapped inline links can have whitespace at their bounding-box center.
    const hit = Array.from(el.getClientRects()).some(rect => {
      const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return !!target && el.contains(target);
    });
    return r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 && hit;
  })).toBe(true);
}
for (const [language, t] of Object.entries({ en, he, ja })) {
  for (const [width, height] of sizes) test(`${language} ${width}x${height}: every duration digit fits at normal and 200% text`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await open(page, language, 'denied');
    for (const fontSize of [16, 32]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
      for (const [rhythm, minutes] of [
        [[4, 0, 5.5, 0], 3], [[40, 120, 40, 120], 120],
        [[.5, 119.5, .5, 119.5], 1], [[5.5, 5.5, 4, 5.5], 3],
      ] as const) {
        for (const [index, value] of rhythm.entries()) {
          const input = page.locator(`#phase-value-${index}`);
          await input.fill(String(value)); await input.blur();
          await expect(input).toHaveValue(String(value));
        }
        await page.locator('#duration').fill(String(minutes)); await page.locator('#duration').blur();
        const fields = await page.locator('.duration-chip input, .length-control input').evaluateAll(elements => elements.map(element => {
          const el = element as HTMLInputElement, style = getComputedStyle(el);
          const ctx = document.createElement('canvas').getContext('2d')!;
          ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          return { value: el.value, size: parseFloat(style.fontSize), available: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), required: ctx.measureText(el.value).width };
        }));
        for (const field of fields) {
          expect(field.size).toBeGreaterThanOrEqual(fontSize);
          expect(field.available).toBeGreaterThanOrEqual(field.required + 2);
        }
        expect(await page.locator('.phase-row').evaluateAll(rows => rows.every(row => {
          const [label, slider, chip] = Array.from(row.children).map(el => el.getBoundingClientRect());
          const overlaps = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
          return !overlaps(label, slider) && !overlaps(label, chip) && !overlaps(slider, chip);
        }))).toBe(true);
      }
      await noOverflow(page);
      await page.locator('#duration').scrollIntoViewIfNeeded();
      await expect(page.locator('#duration')).toBeInViewport();
      if (language === 'en' && width === 320 && fontSize === 32)
        await page.screenshot({ path: '/tmp/accessibility-after-numbers.png' });
    }
    await expect(page.locator('#phase-value-0')).toHaveAttribute('max', '40');
    await expect(page.locator('#phase-value-1')).toHaveAttribute('max', '120');
    await expect(page.locator('#phase-value-0')).toHaveAttribute('step', '0.5');
    await expect(page.getByRole('button', { name: t.advanced, exact: true })).toHaveCount(0);
  });
  for (const [width, height] of [[320, 568], [375, 812]]) for (const fontSize of [16, 32])
    test(`${language} ${width}x${height} ${fontSize}px: consent never obscures Tab or Shift+Tab focus`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const requests: string[] = [];
      page.on('request', request => { if (/googletagmanager|google-analytics/.test(request.url())) requests.push(request.url()); });
      await open(page, language);
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
      await page.locator('.settings-panel').focus();
      for (const key of ['Tab', 'Shift+Tab']) for (let i = 0; i < 27; i++) {
        await page.keyboard.press(key); await visibleFocus(page);
      }
      await page.locator('.start-button').focus(); await visibleFocus(page);
      if (language === 'en' && width === 375 && fontSize === 16)
        await page.screenshot({ path: '/tmp/accessibility-after-consent.png' });
      await noOverflow(page);
      expect(await page.locator('.analytics-notice').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(requests).toEqual([]);
      // Starting remains possible without choosing consent; no mandatory gate.
      await page.locator('.start-button').press('Enter');
      await expect(page.locator('.session-panel')).toBeVisible();
      await expect(page.locator('.analytics-notice')).toHaveCount(0);
      await expect(page.locator('.app-page')).not.toHaveAttribute('data-analytics-notice', 'open');
      expect(requests).toEqual([]);
    });
  test(`${language}: consent close, Escape, decline and accept retain persistence and shield focus`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 }); await open(page, language);
    for (const action of ['close', 'escape', 'decline', 'allow']) {
      if (!(await page.locator('.analytics-notice').count())) await page.getByRole('button', { name: t.analyticsPreferences, exact: true }).click();
      if (action === 'escape') { await page.locator('.analytics-close').focus(); await page.keyboard.press('Escape'); }
      else await page.locator(action === 'close' ? '.analytics-close' : action === 'decline' ? '.analytics-secondary' : '.analytics-primary').click();
      await expect(page.locator('.analytics-notice')).toHaveCount(0);
      await expect(page.getByRole('button', { name: t.analyticsPreferences, exact: true })).toBeFocused();
      await expect(page.locator('.app-page')).not.toHaveAttribute('data-analytics-notice', 'open');
      expect(await page.evaluate(() => localStorage.getItem('breath-flow-analytics-consent'))).toBe(action === 'allow' ? 'granted' : 'denied');
      await page.reload(); await expect(page.locator('.analytics-notice')).toHaveCount(0);
    }
  });
}
