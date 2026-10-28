import { showRetainedAdvanced } from "./retained-advanced";
import { configureBreathing } from "./configure-breathing";
import { test, expect, type Page } from "@playwright/test";
import en from "../src/locales/en.json" with { type: "json" };
import he from "../src/locales/he.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };
const dictionaries = { en, he, ja };
const sizes = [
  { width: 320, height: 568 },
  { width: 360, height: 592 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 375, height: 812 },
  { width: 390, height: 664 },
  { width: 390, height: 844 },
  { width: 393, height: 660 },
  { width: 412, height: 731 },
];
async function open(
  page: Page,
  language = "en",
  saved: Record<string, unknown> = { sound: "silent" },
) {
  await page.addInitScript(
    ({ language, saved }) => {
      localStorage.setItem("breath-flow-language", language);
      if (!localStorage.getItem("still-settings"))
        localStorage.setItem("still-settings", JSON.stringify(saved));
    },
    { language, saved },
  );
  await page.goto("./");
}
async function fits(page: Page) {
  const result = await page.evaluate(() => {
    const app = document.querySelector(".app-page")!,
      view = document.querySelector(".app-view")!.getBoundingClientRect();
    const outside = [
      ...document.querySelectorAll(
        "button,a,input,.brand-mark,.breath-circle,.remaining",
      ),
    ]
      .filter((el) => {
        if (!(el as HTMLElement).offsetParent) return false;
        const b = el.getBoundingClientRect();
        return (
          b.left < -0.5 ||
          b.right > innerWidth + 0.5 ||
          b.top < -0.5 ||
          b.bottom > innerHeight + 0.5
        );
      })
      .map((el) => (el as HTMLElement).className || (el as HTMLElement).id);
    return {
      width: innerWidth,
      height: innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      appWidth: app.clientWidth,
      appScrollWidth: app.scrollWidth,
      appHeight: app.clientHeight,
      appScrollHeight: app.scrollHeight,
      top: view.top,
      bottom: view.bottom,
      outside,
    };
  });
  expect(result.documentWidth).toBe(result.width);
  expect(result.documentHeight).toBe(result.height);
  expect(result.appScrollWidth).toBeLessThanOrEqual(result.appWidth);
  expect(result.appScrollHeight).toBeLessThanOrEqual(result.appHeight + 1);
  expect(result.top).toBeGreaterThanOrEqual(0);
  expect(result.bottom).toBeLessThanOrEqual(result.height);
  expect(result.outside).toEqual([]);
  await page.evaluate(() => window.scrollTo(100, 100));
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-24T12:00:01Z"));
});
for (const [language, t] of Object.entries(dictionaries)) {
  test(`${language}: Settings, preparation and Practice genuinely fit nine mobile viewport sizes`, async ({
    page,
  }) => {
    await open(page, language);
    for (const viewport of sizes) {
      await page.setViewportSize(viewport);
      await fits(page);
      await expect(page.locator(".presets button")).toHaveCount(4);
      const positions = await page
        .locator(".presets button")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
      expect(new Set(positions).size).toBe(1);
      for (const button of await page.locator("button,.footer-action").all()) {
        const box = await button.boundingBox();
        if (box) expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await page.getByRole("button", { name: t.start, exact: true }).click();
      await fits(page);
      await page.clock.fastForward(3020);
      await fits(page);
      const before = await page.locator(".session-controls").boundingBox();
      await page.clock.runFor(2100);
      expect(await page.locator(".session-controls").boundingBox()).toEqual(
        before,
      );
      await page.getByRole("button", { name: t.stop, exact: true }).click();
    }
  });
}
test("Japanese phase labels are short on Settings, both Practice holds and all help instructions", async ({
  page,
}) => {
  await open(page, "en", {sound:"silent"});
  await configureBreathing(page,{preset:"boxBreathing"});
  await page.locator(".language-picker select").selectOption("ja");
  await expect(page.locator(".phase-row > label:first-child")).toHaveText([
    "吸う",
    "止める",
    "吐く",
    "止める",
  ]);
  await expect(page.locator(".settings-panel")).not.toContainText(
    /吸った後|吐いた後/,
  );
  await expect(page.locator("#phase-1")).toHaveAttribute(
    "aria-label",
    "止める (2)",
  );
  await expect(page.locator("#phase-3")).toHaveAttribute(
    "aria-label",
    "止める (4)",
  );
  await page.getByRole("button", { name: ja.howToUse, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "吸う・止める・吐く・止める",
  );
  await expect(page.getByRole("dialog")).not.toContainText(/吸った後|吐いた後/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: ja.start, exact: true }).click();
  await page.clock.fastForward(7020);
  await expect(page.locator(".circle-label h2")).toHaveText("止める");
  await expect(page.locator(".circle-label small")).toHaveCount(0);
  await page.clock.fastForward(8000);
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "3",
  );
  await expect(page.locator(".circle-label h2")).toHaveText("止める");
});
test("linear inhale/exhale bounds, accurate half seconds and clamped manual entry do not shift the layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page);
  const footer = await page.locator(".footer-actions").boundingBox();
  for (const index of [0, 2]) {
    const slider = page.locator(`#phase-${index}`),
      input = page.locator(`#phase-value-${index}`);
    await expect(slider).toHaveAttribute("min", "0.5");
    await expect(slider).toHaveAttribute("max", "40");
    await expect(slider).toHaveAttribute("step", "0.5");
    for (const value of ["4", "5", "5.5", "6", "40"]) {
      await slider.fill(value);
      await expect(input).toHaveValue(value);
    }
    await input.fill("100");
    await input.blur();
    await expect(input).toHaveValue("40");
    await input.fill("0");
    await input.blur();
    await expect(input).toHaveValue("0.5");
    await input.fill("5.5");
    await input.blur();
  }
  expect(await page.locator(".footer-actions").boundingBox()).toEqual(footer);
  await fits(page);
  for (const input of await page.locator('input[type="number"]').all())
    expect(
      await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
});
test("both hold sliders use the precision mapping and keep exact manually entered durations between screens", async ({
  page,
}) => {
  await open(page);
  for (const index of [1, 3]) {
    const slider = page.locator(`#phase-${index}`),
      input = page.locator(`#phase-value-${index}`);
    await expect(slider).toHaveAttribute("aria-valuemax", "120");
    await expect(slider).toHaveAttribute("step", "any");
    for (const [position, seconds] of [
      ["0", "0"],
      ["3.5", "1.5"],
      ["70", "30"],
      ["80", "60"],
      ["90", "90"],
      ["100", "120"],
    ]) {
      await slider.fill(position);
      await expect(input).toHaveValue(seconds);
      await expect(slider).toHaveAttribute("aria-valuenow", seconds);
    }
    await input.fill("31.5");
    await input.blur();
    await expect(input).toHaveValue("31.5");
    await expect(slider).toHaveValue("70.5");
  }
  await page.getByRole("button",{name:en.start,exact:true}).click();
  await page.getByRole("button",{name:en.stop,exact:true}).click();
  for (const index of [1, 3]) {
    await expect(page.locator(`#phase-value-${index}`)).toHaveValue("31.5");
    await expect(page.locator(`#phase-${index}`)).toHaveValue("70.5");
  }
  await page.locator("#phase-1").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#phase-value-1")).toHaveValue("32");
  await page.keyboard.press("Home");
  await expect(page.locator("#phase-value-1")).toHaveValue("0");
  await page.keyboard.press("End");
  await expect(page.locator("#phase-value-1")).toHaveValue("120");
});
test("legacy overlong breaths and saved Custom memory are migrated without losing preferences", async ({
  page,
}) => {
  await open(page, "en", {
    preset: "boxBreathing",
    rhythm: [4, 4, 4, 4],
    customRhythm: [120, 31.5, 85, 119.5],
    minutes: 7,
    sound: "silent",
    volume: 0.25,
    background: "photo-5",
  });
  await page.locator('[data-home-choice="custom"]').click();
  for (const [i, value] of [40, 31.5, 40, 119.5].entries())
    await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(value));
  await page.reload();
  await expect(page.locator("#phase-value-0")).toHaveValue("40");
  await expect(page.locator("#duration")).toHaveValue("7");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("still-settings")!),
  );
  expect(saved.background).toBe("photo-5");
  expect(saved.volume).toBe(0.25);
  expect(saved.sound).toBe("silent");
  await page
    .getByRole("button", { name: en.coherentBreathing, exact: true })
    .click();
  for (const [i, value] of [5.5, 0, 5.5, 0].entries())
    await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(value));
});
test("safe-area-like padding, reduced viewport height and expanded options keep every essential action reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await open(page, "he");
  await page.locator(".app-page").evaluate((el) => {
    (el as HTMLElement).style.paddingTop = "44px";
    (el as HTMLElement).style.paddingBottom = "34px";
  });
  await fits(page);
  await page.setViewportSize({ width: 390, height: 744 });
  await fits(page);
  await page.setViewportSize({ width: 390, height: 664 });
  await fits(page);
  await showRetainedAdvanced(page); await page.getByRole("button", { name: he.advanced, exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: he.background, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: he.start, exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: he.start, exact: true }),
  ).toBeInViewport();
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  await page.locator(".footer-actions button").last().scrollIntoViewIfNeeded();
  await expect(page.locator(".footer-actions button").last()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
