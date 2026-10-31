import { test, expect } from '@playwright/test';
import { holdDurationToSliderPosition } from '../src/duration-controls';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: each Box phase synchronizes by entry, slider and keyboard, while other presets remain independent`, async ({ page }) => {
    await page.addInitScript(language => {
      localStorage.setItem('breath-flow-language', language);
      if (!localStorage.getItem('still-settings'))
        localStorage.setItem('still-settings', JSON.stringify({ sound: 'silent' }));
    }, language);
    await page.goto('./');
    await page.locator('[data-home-choice="box"]').click();
    const equal = async (value: number) => {
      for (let index = 0; index < 4; index++)
        await expect(page.locator(`#phase-value-${index}`)).toHaveValue(String(value));
      await expect(page.locator('[data-home-choice="box"]')).toHaveAttribute('aria-pressed', 'true');
    };
    for (let index = 0; index < 4; index++) {
      const input = page.locator(`#phase-value-${index}`);
      await expect(input).toHaveAttribute('min', '0.5');
      await expect(input).toHaveAttribute('max', '40');
      await expect(input).toHaveAttribute('step', '0.5');
      await input.fill(String(5.5 + index * .5)); await input.blur();
      await equal(5.5 + index * .5);
      const duration = 3.5 + index * .5;
      await page.locator(`#phase-${index}`).fill(String(index === 1 || index === 3 ? Number(holdDurationToSliderPosition(duration).toFixed(6)) : duration));
      await equal(duration);
    }
    await page.locator('#phase-1').press('Home'); await equal(.5);
    await page.locator('#phase-1').press('ArrowRight'); await equal(1);
    await page.locator('#phase-3').press('End'); await equal(40);
    await page.locator('#phase-value-1').fill('120'); await page.locator('#phase-value-1').blur(); await equal(40);
    await page.locator('#phase-value-3').fill('0'); await page.locator('#phase-value-3').blur(); await equal(.5);
    await page.locator('#phase-value-2').fill('6.5'); await page.locator('#phase-value-2').blur(); await equal(6.5);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('still-settings')!).preset)).toBe('boxBreathing');
    await page.reload(); await equal(6.5);
    for (const choice of ['coherent', '478', 'custom']) for (let index = 0; index < 4; index++) {
      await page.locator(`[data-home-choice="${choice}"]`).click();
      const before = await page.locator('.duration-chip input').evaluateAll(inputs => inputs.map(input => Number((input as HTMLInputElement).value)));
      const value = before[index] === 6.5 ? 5.5 : 6.5;
      const expected = [...before]; expected[index] = value;
      await page.locator(`#phase-value-${index}`).fill(String(value)); await page.locator(`#phase-value-${index}`).blur();
      expect(await page.locator('.duration-chip input').evaluateAll(inputs => inputs.map(input => Number((input as HTMLInputElement).value)))).toEqual(expected);
      await expect(page.locator('#phase-value-1')).toHaveAttribute('max', '120');
      await expect(page.locator('#phase-value-3')).toHaveAttribute('min', '0');
    }
  });

  test(`${language}: exact Coherent card copy is fully visible without changing card dimensions`, async ({ page }) => {
    await page.addInitScript(language => localStorage.setItem('breath-flow-language', language), language);
    await page.goto('./'); await page.locator('[data-home-choice="explore"]').click();
    for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      const card = page.locator('[data-practice="coherent"]');
      await expect(card.locator(':scope > span > span')).toHaveText(t.coherentShort);
      const dimensions = await card.evaluate(el => {
        // An invisible reference uses the original generic card rules. Compare
        // against it at each viewport instead of hardcoding rounded pixel sizes.
        const reference = el.cloneNode(true) as HTMLElement;
        reference.removeAttribute('data-practice'); reference.setAttribute('aria-hidden', 'true');
        reference.style.visibility = 'hidden'; el.after(reference);
        const before = reference.getBoundingClientRect(), after = el.getBoundingClientRect();
        const summary = el.querySelector(':scope > span > span') as HTMLElement;
        const box = summary.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(summary);
        const textFits = [...range.getClientRects()].every(r => r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1);
        const result = { beforeHeight: before.height, afterHeight: after.height, beforeWidth: before.width, afterWidth: after.width, textFits };
        reference.remove(); return result;
      });
      expect(Math.abs(dimensions.beforeHeight - dimensions.afterHeight)).toBeLessThan(1);
      expect(dimensions.afterWidth).toBe(dimensions.beforeWidth);
      expect(dimensions.textFits).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (viewport.width === 320) await page.screenshot({ path: `/tmp/breath-flow-coherent-card-${language}.png` });
    }
  });
}
