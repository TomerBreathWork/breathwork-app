import { showRetainedAdvanced } from "./retained-advanced";
import { test, expect, type Page } from "@playwright/test";
import en from "../src/locales/en.json" with { type: "json" };
import he from "../src/locales/he.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };
import { practices } from "../src/practices";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-27T12:00:01Z"));
  await page.addInitScript(() => {
    if (!localStorage.getItem("still-settings")) localStorage.setItem(
      "still-settings",
      JSON.stringify({ sound: "silent", audioOutputVersion: 1, volume: 0.2, background: "photo-4" }),
    );
  });
});
async function openLibrary(page: Page) {
  await page.locator('[data-home-choice="explore"]').click();
  await expect(page.locator(".practice-list")).toBeVisible();
}
async function shellFits(page: Page) {
  const box = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    docWidth: document.documentElement.scrollWidth,
    docHeight: document.documentElement.scrollHeight,
    appWidth: document.querySelector(".app-page")!.scrollWidth,
    appHeight: document.querySelector(".app-page")!.scrollHeight,
  }));
  expect(box.docWidth).toBe(box.width);
  expect(box.docHeight).toBe(box.height);
  expect(box.appWidth).toBe(box.width);
  expect(box.appHeight).toBe(box.height);
}
for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: localized discovery, five reusable details, category filters, Back and mobile layouts`, async ({
    page,
  }) => {
    await page.addInitScript(
      (language) => localStorage.setItem("breath-flow-language", language),
      language,
    );
    await page.goto("./");
    await expect(page.locator("#duration")).toHaveValue("3");
    await expect(page.locator("#phase-value-0")).toHaveValue("5.5");
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 360, height: 640 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await shellFits(page);
      await openLibrary(page);
      await shellFits(page);
      await expect(page.locator(".practice-card")).toHaveCount(5);
      for (const [key, count] of [
        ["categoryCalm", 3],
        ["categoryFocus", 3],
      ] as const) {
        await page.getByRole("button", { name: t[key], exact: true }).click();
        await expect(page.locator(".practice-card")).toHaveCount(count);
      }
      await page
        .getByRole("button", { name: t.allPractices, exact: true })
        .click();
      for (const practice of practices) {
        await page.locator(`[data-practice="${practice.id}"]`).click();
        await expect(page.locator("[data-practice-detail] h2")).toHaveText(
          t[practice.name],
        );
        await shellFits(page);
        await expect(
          page.getByRole("button", { name: t.start, exact: true }),
        ).toBeInViewport();
        await expect(page.locator(".details-body")).toContainText(
          t[practice.explanation],
        );
        await page.goBack();
        await expect(page.locator(".practice-list")).toBeVisible();
      }
      if (viewport.width === 375)
        await page.screenshot({
          path: `/workspace/artifacts/breath-flow/library-${language}.png`,
        });
      await page.goBack();
      await expect(page.locator(".settings-panel")).toBeVisible();
      await shellFits(page);
    }
    await page.goForward();
    await expect(page.locator(".practice-list")).toBeVisible();
    await page.goForward();
    await expect(page.locator("[data-practice-detail]")).toHaveAttribute(
      "data-practice-detail",
      "478",
    );
    await expect(page.locator(".session-panel")).toHaveCount(0);
  });
}
test("equal and extended ratios start directly from Details with exact fractional timings", async ({
  page,
}) => {
  await page.goto("./");
  await openLibrary(page);
  for (const [id, multiplier] of [
    ["equal", 1],
    ["extended", 2],
  ] as const) {
    await page.locator(`[data-practice="${id}"]`).click();
    await expect(page.locator("#duration")).toHaveValue("3");
    await page.locator("#practice-base").fill("5.5");
    await page.locator("#duration").fill("");
    await page.locator("#practice-base").focus();
    await page.locator("#practice-base").blur();
    await expect(page.locator("#practice-base")).toHaveValue("5.5");
    await expect(
      page.getByRole("button", { name: en.start, exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".derived-exhale")).toContainText(
      String(5.5 * multiplier),
    );
    await expect(page.locator(".coupled-controls output")).toContainText(
      `5.5 / 0 / ${5.5 * multiplier} / 0`,
    );
    await page.locator(".quick-lengths button").first().click();
    await page.locator("#duration").fill("1");
    await page.getByRole("button", { name: en.start, exact: true }).click();
    await expect(page.locator(".phase-count")).toHaveText("3");
    await expect(page.locator(".scenery")).toHaveAttribute(
      "src",
      /backgrounds\/4\.webp$/,
    );
    await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
    await expect(
      page.getByRole("slider", { name: en.volume, exact: true }),
    ).toHaveValue("0.2");
    await expect(
      page.getByRole("combobox", { name: en.sound, exact: true }),
    ).toHaveValue("silent");
    await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
    const actual = "01:06";
    await expect(page.locator(".remaining-value")).toHaveText(actual);
    await expect(page.locator(".breath-route-icon")).toHaveCount(0);
    await page.clock.runFor(2990);
    await expect(page.locator(".phase-count")).toHaveText("1");
    await expect(page.locator(".remaining-value")).toHaveText(actual);
    await page.clock.runFor(30);
    await expect(page.locator(".phase-count")).toHaveText("5.5");
    await expect(page.locator(".breath-route-icon")).toHaveAttribute(
      "data-route",
      "nose",
    );
    await page.clock.runFor(5500);
    await expect(page.locator(".breath-circle")).toHaveAttribute(
      "data-phase",
      "2",
    );
    await page.getByRole("button", { name: en.pause, exact: true }).click();
    const count = await page.locator(".phase-count").innerText();
    await page.clock.runFor(2000);
    await expect(page.locator(".phase-count")).toHaveText(count);
    await page.getByRole("button", { name: en.resume, exact: true }).click();
    await expect(
      page.getByRole("button", { name: en.pause, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: en.restart, exact: true }).click();
    await expect(page.locator(".phase-count")).toHaveText("3");
    await page.clock.runFor(3020);
    await page.clock.fastForward(65940);
    await expect(page.locator(".breath-circle")).toHaveAttribute(
      "data-phase",
      "2",
    );
    await expect(page.locator(".breath-circle")).toHaveAttribute(
      "data-status",
      "running",
    );
    await page.clock.runFor(100);
    await expect(
      page.getByRole("heading", { name: en.complete, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".remaining-value")).toHaveText("00:00");
    await page.getByRole("button", { name: en.stop, exact: true }).click();
    await expect(page.locator("[data-practice-detail]")).toHaveAttribute(
      "data-practice-detail",
      id,
    );
    await expect(page.locator("#practice-base")).toHaveValue("5.5");
    await page.goBack();
    await expect(page.locator(".practice-list")).toBeVisible();
  }
});
test("Box adjusts four equal phases, keeps its identity and preserves choices on Home", async ({
  page,
}) => {
  await page.goto("./");
  await openLibrary(page);
  await page.locator('[data-practice="box"]').click();
  await page.locator("#practice-base").fill("3.5");
  await expect(page.locator("output")).toContainText("3.5 / 3.5 / 3.5 / 3.5");
  await expect(page.locator(".suggested-rhythm")).toContainText(
    en.adjustedRhythm,
  );
  for (const minutes of [5, 10, 3]) {
    await page
      .locator(".quick-lengths button")
      .filter({ hasText: String(minutes) })
      .click();
    await expect(page.locator("#duration")).toHaveValue(String(minutes));
  }
  await page.getByRole("button", { name: en.start, exact: true }).click();
  await expect(page.locator(".remaining-value")).toHaveText("03:02");
  await page.getByRole("button", { name: en.stop, exact: true }).click();
  await page.goBack();
  await page.goBack();
  await expect(page.locator(".settings-panel")).toHaveAttribute(
    "data-selected-practice",
    "box",
  );
  for (let i = 0; i < 4; i++)
    await expect(page.locator(`#phase-value-${i}`)).toHaveValue("3.5");
  await page.reload();
  await expect(page.locator(".settings-panel")).toHaveAttribute(
    "data-selected-practice",
    "box",
  );
  await expect(page.locator("#duration")).toHaveValue("3");
});
test("nasal/mouth guidance is localized, hidden in both holds, and does not move the countdown", async ({
  page,
}) => {
  await page.goto("./");
  await openLibrary(page);
  await page.locator('[data-practice="478"]').click();
  for (let i = 0; i < 4; i++) await page.locator(`#phase-value-${i}`).fill("1");
  await page.locator("#duration").fill("1");
  await page.getByRole("button", { name: en.start, exact: true }).click();
  await page.clock.runFor(3020);
  await expect(page.locator(".breath-route-guidance")).toContainText(
    en.throughNose,
  );
  await expect(page.locator(".breath-route-icon")).toHaveAttribute(
    "data-route",
    "nose",
  );
  const position = (await page.locator(".phase-count").boundingBox())!.y;
  await page.clock.runFor(1000);
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "1",
  );
  await expect(page.locator(".breath-route-icon")).toHaveCount(0);
  expect((await page.locator(".phase-count").boundingBox())!.y).toBe(position);
  await page.clock.runFor(1000);
  await expect(page.locator(".breath-route-guidance")).toContainText(
    en.throughMouth,
  );
  await expect(page.locator(".breath-route-icon")).toHaveAttribute(
    "data-route",
    "mouth",
  );
  await page.clock.runFor(1000);
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "3",
  );
  await expect(page.locator(".breath-route-icon")).toHaveCount(0);
});

test("large text and short landscape retain usable discovery scrolling and a reachable Start", async ({
  page,
}) => {
  await page.goto("./");
  await openLibrary(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.locator('[data-practice="extended"]').scrollIntoViewIfNeeded();
  await page.locator('[data-practice="extended"]').click();
  expect(
    await page.locator(".details-body").evaluate((el) => el.clientHeight),
  ).toBeGreaterThan(100);
  await page
    .getByRole("button", { name: en.start, exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: en.start, exact: true }),
  ).toBeInViewport();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize({ width: 740, height: 360 });
  await page
    .getByRole("button", { name: en.start, exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: en.start, exact: true }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    740,
  );
});
