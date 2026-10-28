import { test, expect } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: library link is 15% larger, fits mobile, and legacy quiet volume migrates to calibrated playback`, async ({ page }) => {
    await page.addInitScript(language => {
      localStorage.setItem('breath-flow-language', language);
      localStorage.setItem('still-settings', JSON.stringify({ volume: .35, sound: 'bowls', background: 'photo-3' }));
      (window as any).audioGains = [];
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        createGain() { const gain = super.createGain(); (window as any).audioGains.push(gain); return gain; }
      };
    }, language);
    await page.goto('./');
    await expect(page.locator('.start-button')).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'he' ? 'rtl' : 'ltr');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!).volume);
    expect(saved).toBe(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!).audioOutputVersion)).toBe(1);
    // The hidden legacy master must not attenuate returning users. The rhythm
    // level is installed immediately before the first cue; idle is silent.
    const effective = await page.evaluate(() => (window as any).audioGains[0].gain.value * (window as any).audioGains[2].gain.value);
    expect(effective).toBe(1);
    const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!));
    expect(preferences.background).toBe('photo-3'); expect(preferences.sound).toBe('bowls');
    for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const link = page.locator('[data-home-choice="explore"]');
      await expect(link).toHaveText(t.exploreMore);
      const size = await link.evaluate(el => {
        const css = getComputedStyle(el), root = getComputedStyle(document.documentElement);
        const range = document.createRange(); range.selectNodeContents(el);
        const box = el.getBoundingClientRect();
        return {
          ratio: parseFloat(css.fontSize) / (.75 * parseFloat(root.fontSize)),
          color: css.color, decoration: css.textDecorationLine,
          overflow: el.scrollWidth - el.clientWidth,
          textFits: [...range.getClientRects()].every(r => r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1),
        };
      });
      expect(size.ratio).toBeCloseTo(1.15, 5);
      expect(size.color).toBe('rgb(25, 72, 74)'); expect(size.decoration).toContain('underline');
      expect(size.overflow).toBeLessThanOrEqual(1); expect(size.textFits).toBe(true);
      expect(await page.locator('.app-page').evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      await expect(page.locator('.footer-actions')).toBeInViewport();
      await link.click(); await expect(page.locator('.discovery-panel h2')).toHaveText(t.explore);
      await page.locator('.discovery-back').click();
      await expect(page.locator('.settings-panel')).toBeVisible();
    }
  });
}

for (const volume of [0, .05, .35, 1]) test(`legacy volume ${volume} cannot keep the new output quiet`, async ({ page }) => {
  await page.addInitScript(volume => localStorage.setItem('still-settings', JSON.stringify({ volume, sound: 'silent', background: 'photo-4', preset: 'custom', rhythm: [6.5, 0, 8, 0], minutes: 5 })), volume);
  await page.goto('./'); await expect(page.locator('.start-button')).toBeEnabled();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!));
  expect(saved.volume).toBe(1); expect(saved.audioOutputVersion).toBe(1);
  expect(saved.sound).toBe('silent'); expect(saved.background).toBe('photo-4');
  expect(saved.rhythm).toEqual([6.5, 0, 8, 0]); expect(saved.minutes).toBe(5);
  await page.reload(); await expect(page.locator('.start-button')).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!).volume)).toBe(1);
});

test('an explicit volume in the new output version is preserved on reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('still-settings', JSON.stringify({ audioOutputVersion: 1, volume: .2, sound: 'bowls', background: 'photo-2' })));
  await page.goto('./'); await expect(page.locator('.start-button')).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!).volume)).toBe(.2);
  await page.reload(); await expect(page.locator('.start-button')).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!).volume)).toBe(.2);
});
