import { test, expect } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: library link is 15% larger, fits mobile, and saved volume gets the 25% playback increase`, async ({ page }) => {
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
    expect(saved).toBe(.35);
    // Inspect the real graph after restoring an old saved preference. Neither
    // changing the default alone nor migrating only new users would pass this.
    const effective = await page.evaluate(() => (window as any).audioGains[0].gain.value * (window as any).audioGains[2].gain.value);
    expect(effective).toBeCloseTo(saved * .25 * 1.25, 6);
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
