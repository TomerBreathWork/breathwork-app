import type { Page } from "@playwright/test";
/** Choose timing through the real UI: saved timings are intentionally ignored. */
export async function configureBreathing(
  page: Page,
  settings: { rhythm?: readonly number[]; minutes?: number; preset?: string },
) {
  const names: Record<string, string> = {
    coherentBreathing: "Coherent Breath",
    boxBreathing: "Box Breath",
    eveningUnwind: "4-7-8",
    custom: "Custom",
  };
  if (settings.preset && names[settings.preset])
    await page
      .getByRole("button", { name: names[settings.preset], exact: true })
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
