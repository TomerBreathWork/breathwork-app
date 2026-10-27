import { expect, type Page } from "@playwright/test";
/** Configure the real UI, including discovery for named library patterns. */
export async function configureBreathing(
  page: Page,
  settings: { rhythm?: readonly number[]; minutes?: number; preset?: string },
) {
  const preset = settings.preset;
  if (preset === "boxBreathing" || preset === "eveningUnwind") {
    const minutes = await page.locator("#duration").inputValue();
    await page.locator('[data-home-choice="explore"]').click();
    await page.locator(".category-filters button").first().click();
    await page
      .locator(`[data-practice="${preset === "boxBreathing" ? "box" : "478"}"]`)
      .click();
    await page.locator(".discovery-back").click();
    await expect(page.locator(".practice-list")).toBeVisible();
    await page.locator(".discovery-back").click();
    await expect(page.locator(".settings-panel")).toBeVisible();
    await page.locator("#duration").fill(minutes);
  } else if (preset === "coherentBreathing" || preset === "custom")
    await page
      .locator(
        `[data-home-choice="${preset === "custom" ? "custom" : "coherent"}"]`,
      )
      .click();
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
