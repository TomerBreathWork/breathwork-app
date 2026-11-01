import { test, expect } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };

for (const [variant, t] of Object.entries({ en, he, ja, jaWithoutSegmenter: ja })) {
  const language = variant === 'jaWithoutSegmenter' ? 'ja' : variant;
  test(`${variant}: footer stays aligned, tappable and unclipped at 320, 360 and 390 pixels`, async ({ page }) => {
    if (variant === 'jaWithoutSegmenter')
      await page.addInitScript(() => Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true }));
    await page.addInitScript(language => {
      localStorage.setItem('breath-flow-language', language);
      localStorage.setItem('still-settings', JSON.stringify({ sound: 'silent' }));
    }, language);
    await page.goto('./');
    const expected = language === 'ja' ? ['共有', 'お問い合わせ', '使い方'] : [t.share, t.contact, t.howToUse];
    for (const viewport of [{ width: 320, height: 568 }, { width: 320, height: 844 }, { width: 360, height: 640 }, { width: 360, height: 844 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const footer = page.locator('.footer-actions');
      await expect(footer.locator('.footer-action')).toHaveText(expected);
      const buttons = await footer.locator('.footer-action').evaluateAll(elements => elements.map(el => {
        const box = el.getBoundingClientRect(), label = el.querySelector(':scope > span')!;
        const icon = el.querySelector('svg')!.getBoundingClientRect(), labelBox = label.getBoundingClientRect();
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        const rects: DOMRect[] = [];
        while (walker.nextNode()) {
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          rects.push(...range.getClientRects());
        }
        return {
          top: box.top, height: box.height, width: box.width,
          labelLines: new Set(rects.map(rect => Math.round(rect.top))).size,
          textFits: rects.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1),
          alignment: Math.abs((labelBox.top + labelBox.bottom - icon.top - icon.bottom) / 2),
          fontSize: parseFloat(getComputedStyle(el).fontSize),
        };
      }));
      expect(new Set(buttons.map(button => button.top)).size).toBe(1);
      for (const button of buttons) {
        expect(button.height).toBeGreaterThanOrEqual(44); expect(button.width).toBeGreaterThanOrEqual(44);
        expect(button.textFits).toBe(true); expect(button.alignment).toBeLessThanOrEqual(1);
        if (language === 'ja') expect(button.labelLines).toBe(1);
        else expect(button.fontSize).toBe(12);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(footer).toBeInViewport();
      if (language === 'ja') await page.screenshot({ path: `/tmp/breath-flow-ja-footer-${viewport.width}.png` });
    }
  });
}
