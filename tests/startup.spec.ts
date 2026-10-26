import { test, expect, type Page } from "@playwright/test";
import { configureBreathing } from "./configure-breathing";
import en from "../src/locales/en.json" with { type: "json" };
import he from "../src/locales/he.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };

async function defaults(page: Page) {
  await expect(
    page.getByRole("button", { name: "Coherent Breath", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const [i, value] of [5.5, 0, 5.5, 0].entries())
    await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(value));
  await expect(page.locator("#duration")).toHaveValue("3");
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-26T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-26T12:00:01Z"));
});
for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: every launch resets timing while current-session choices and other preferences survive`, async ({
    page,
  }) => {
    await page.addInitScript((language) => {
      if (!localStorage.getItem("still-settings")) {
        localStorage.setItem("breath-flow-language", language);
        localStorage.setItem(
          "still-settings",
          JSON.stringify({
            preset: "custom",
            rhythm: [120, 31.5, 100, 5],
            customRhythm: [10, 2, 8, 1],
            minutes: 27,
            background: "photo-4",
            sound: "silent",
            volume: 0.2,
          }),
        );
      }
    }, language);
    await page.goto("./");
    await defaults(page);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      language === "he" ? "rtl" : "ltr",
    );
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await expect(page.locator("#phase-value-0")).toHaveValue("5.5"); // Old Custom memory was discarded too.
    const chosen = { preset: "custom", rhythm: [6.5, 1.5, 8, 0.5], minutes: 2 };
    await configureBreathing(page, chosen);
    await page.getByRole("button", { name: "Box Breath", exact: true }).click();
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByRole("button", { name: t.start, exact: true }).click();
    await expect(page.locator(".remaining-value")).toHaveText("02:12");
    await page.getByRole("button", { name: t.stop, exact: true }).click();
    for (const [i, value] of chosen.rhythm.entries())
      await expect(page.locator(`#phase-value-${i}`)).toHaveValue(
        String(value),
      );
    await expect(page.locator("#duration")).toHaveValue("2");
    await expect(
      page.getByRole("button", { name: "Custom", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: t.start, exact: true }).click();
    await page.goBack();
    await expect(page.locator("#duration")).toHaveValue("2");
    await expect(page.locator("#phase-value-0")).toHaveValue("6.5");
    await page.reload();
    await defaults(page);
    await page.getByRole("button", { name: t.advanced, exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: t.sound, exact: true }),
    ).toHaveValue("silent");
    await expect(
      page.getByRole("combobox", { name: t.background, exact: true }),
    ).toHaveValue("photo-4");
    await expect(
      page.getByRole("slider", { name: t.volume, exact: true }),
    ).toHaveValue("0.2");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    // A new document navigation (rather than reload) also starts with defaults.
    await page.getByRole("button", { name: t.advanced, exact: true }).click();
    await configureBreathing(page, { preset: "boxBreathing", minutes: 7 });
    await page.goto("./");
    await defaults(page);
  });
}
test("a new user receives 187 breathing seconds after five silent preparation seconds and finishes the final exhale", async ({
  page,
}) => {
  await page.goto("./");
  await defaults(page);
  await page.getByRole("button", { name: en.advanced, exact: true }).click();
  await page
    .getByRole("combobox", { name: en.sound, exact: true })
    .selectOption("silent");
  await page.getByRole("button", { name: en.start, exact: true }).click();
  await expect(page.locator(".remaining-value")).toHaveText("03:07");
  await page.clock.runFor(4990);
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "preparation",
  );
  await expect(page.locator(".remaining-value")).toHaveText("03:07");
  await page.clock.runFor(30);
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "0",
  );
  await expect(page.locator(".remaining-value")).toHaveText("03:07");
  await page.clock.fastForward(186940);
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "2",
  );
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-status",
    "running",
  );
  await page.getByRole("button", { name: en.pause, exact: true }).click();
  await page.clock.runFor(10000);
  await expect(page.locator(".remaining-value")).toHaveText("00:01");
  await page.getByRole("button", { name: en.resume, exact: true }).click();
  await expect(
    page.getByRole("button", { name: en.pause, exact: true }),
  ).toBeVisible();
  await page.clock.runFor(100);
  await expect(
    page.getByRole("heading", { name: en.complete, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".remaining-value")).toHaveText("00:00");
  await page.clock.fastForward(11000);
  await expect(
    page.getByRole("heading", { name: en.complete, exact: true }),
  ).toBeVisible();
});
