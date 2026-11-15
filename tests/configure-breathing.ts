import { type Page } from "@playwright/test";
/** Configure the real UI, including discovery for named library patterns. */
export async function configureBreathing(
  page: Page,
  settings: { rhythm?: readonly number[]; minutes?: number; preset?: string },
) {
  const preset = settings.preset;
  const choice = { coherentBreathing: "coherent", boxBreathing: "box", eveningUnwind: "478", custom: "custom" }[preset ?? ""];
  if (choice) {
    const chooseAnother = page.locator(".choose-another");
    if (await chooseAnother.isVisible()) await chooseAnother.click();
    await page.locator(`[data-home-choice="${choice}"]`).click();
  }
  if (!choice && await page.locator('.home-welcome').isVisible()) {
    const id = await page.locator('.settings-panel').getAttribute('data-selected-practice');
    const saved = page.locator(`[data-home-choice="${id}"]`);
    await (await saved.count() ? saved : page.locator('[data-home-choice="custom"]')).click();
  }
  if (settings.rhythm)
    for (const [i, value] of settings.rhythm.entries()) {
      await page.locator(`#phase-value-${i}`).fill(String(value));
      await page.locator(`#phase-value-${i}`).blur();
    }
  if (settings.minutes !== undefined) {
    await page.locator("#duration").fill(String(settings.minutes));
    await page.locator("#duration").blur();
  }
}
