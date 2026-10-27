import { showRetainedAdvanced } from "./retained-advanced";
import { configureBreathing } from "./configure-breathing";
import { test, expect } from "@playwright/test";
import en from "../src/locales/en.json" with { type: "json" };
import he from "../src/locales/he.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-24T12:00:01Z"));
});
for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: coherent default, decimal inputs, same-session custom memory and centered branding`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(
      (language) => localStorage.setItem("breath-flow-language", language),
      language,
    );
    await page.goto("./");
    await expect(
      page.getByRole("button", { name: t.coherentBreathing, exact: false }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#phase-0")).toHaveValue("5.5");
    await expect(page.locator("#phase-2")).toHaveValue("5.5");
    for (const input of await page
      .locator('.phase-row input[type="number"], #phase-0, #phase-2')
      .all())
      await expect(input).toHaveAttribute("step", "0.5");
    const input = page.getByRole("spinbutton", {
      name: t.phaseSeconds.replace("{phase}", t.inhale),
      exact: true,
    });
    await input.fill("6.5");
    await page.locator("#phase-2").fill("4.5");
    await page.getByRole("button", {name:t.start,exact:true}).click();
    await page.getByRole("button", {name:t.stop,exact:true}).click();
    await expect(input).toHaveValue("6.5");
    await expect(page.locator("#phase-2")).toHaveValue("4.5");
    await expect(
      page.getByRole("button", { name: t.custom, exact: false }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: t.coherentBreathing, exact: false })
      .click();
    await page.getByRole("button", { name: t.custom, exact: false }).click();
    await page.reload();
    await expect(page.getByRole("button", {name:t.custom,exact:true})).toHaveAttribute("aria-pressed","true");
    await expect(input).toHaveValue("6.5");
    await expect(page.locator("#duration")).toHaveValue("3");
    const center = await page.locator(".brand-mark").boundingBox();
    expect(center!.x + center!.width / 2).toBeCloseTo(187.5, 0);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(812);
  });
}
for (const saved of [
  {
    rhythm: [3.5, 1, 7, 0.5],
    minutes: 7,
    sound: "silent",
    volume: 0.25,
    background: "photo-2",
  },
  { minutes: 7, sound: "silent", volume: 0.25, background: "photo-2" },
])
  test(`saved ${"rhythm" in saved ? "explicit rhythm" : "secondary preferences without a rhythm"} restore valid saved choices and secondary preferences`, async ({
    page,
  }) => {
    await page.addInitScript(
      (saved) => localStorage.setItem("still-settings", JSON.stringify(saved)),
      saved,
    );
    await page.goto("./");
    await expect(page.locator("#duration")).toHaveValue("7");
    await expect(page.locator("#phase-0")).toHaveValue(
      "rhythm" in saved ? "3.5" : "5.5",
    );
    await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: en.sound, exact: true }),
    ).toHaveValue("silent");
    await expect(
      page.getByRole("slider", { name: en.volume, exact: true }),
    ).toHaveValue("0.25");
    await expect(
      page.getByRole("combobox", { name: en.background, exact: true }),
    ).toHaveValue("photo-2");
  });
for (const [rhythm, seconds, lastPhase] of [
  [[5.5, 0, 5.5, 0], 66, "2"],
  [[5, 5, 5, 5], 60, "3"],
  [[4, 4, 4, 4], 64, "3"],
  [[4.5, 0, 6, 0], 63, "2"],
] as const) {
  test(`60-second request, ${rhythm.join("/")} completes after ${seconds}s with final-cycle pause/resume`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      (rhythm) =>
        localStorage.setItem(
          "still-settings",
          JSON.stringify({
            rhythm,
            minutes: 1,
            sound: "silent",
            background: "photo-3",
            volume: 0.35,
          }),
        ),
      rhythm,
    );
    await page.goto("./");
    await configureBreathing(page,{rhythm,minutes:1});
    await page.getByRole("button", { name: en.start, exact: true }).click();
    const timer = `01:${String(seconds - 60).padStart(2, "0")}`;
    await expect(page.locator(".remaining-value")).toHaveText(timer);
    await page.clock.runFor(2990);
    await expect(page.locator(".breath-circle")).toHaveAttribute(
      "data-phase",
      "preparation",
    );
    await expect(page.locator(".remaining-value")).toHaveText(timer);
    await page.clock.runFor(30);
    await expect(
      page.getByRole("heading", { name: en.inhale, exact: true }),
    ).toBeVisible();
    await page.clock.fastForward(seconds * 1000 - 60);
    await expect(page.locator(".breath-circle")).toHaveAttribute(
      "data-phase",
      lastPhase,
    );
    await expect(page.locator(".breath-circle")).toHaveAttribute(
      "data-status",
      "running",
    );
    await page.getByRole("button", { name: en.pause, exact: true }).click();
    await page.clock.runFor(10000);
    await expect(page.locator(".remaining-value")).toHaveText("00:01");
    await page.getByRole("button", { name: en.resume, exact: true }).click();
    await page.clock.runFor(100);
    await expect(
      page.getByRole("heading", { name: en.complete, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".remaining-value")).toHaveText("00:00");
    await page.clock.runFor(10000);
    await expect(
      page.getByRole("heading", { name: en.complete, exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("coherent native audio skips both holds and emits exactly twelve strikes for six cycles", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "still-settings",
      JSON.stringify({
        rhythm: [5.5, 0, 5.5, 0],
        minutes: 1,
        sound: "bowls",
        background: "photo-3",
        volume: 0,
      }),
    );
    const Context = window.AudioContext,
      Offline = window.OfflineAudioContext,
      notes = new Map<AudioBuffer, number>();
    (window as any).played = [];
    window.OfflineAudioContext = class extends Offline {
      frequency = 0;
      createOscillator() {
        const osc = super.createOscillator(),
          start = osc.start.bind(osc);
        osc.start = (...args) => {
          if (!this.frequency) this.frequency = osc.frequency.value;
          start(...args);
        };
        return osc;
      }
      async startRendering() {
        const buffer = await super.startRendering();
        notes.set(buffer, this.frequency);
        return buffer;
      }
    };
    window.AudioContext = class extends Context {
      createBufferSource() {
        const source = super.createBufferSource(),
          start = source.start.bind(source);
        source.start = (...args) => {
          (window as any).played.push(notes.get(source.buffer!));
          start(...args);
        };
        return source;
      }
    };
  });
  await page.goto("./");
  await configureBreathing(page,{minutes:1});
  await page.getByRole("button", { name: en.start, exact: true }).click();
  await expect(page.locator(".session-panel")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 15000 },
  );
  expect(await page.evaluate(() => (window as any).played)).toEqual([]);
  await page.clock.runFor(3020);
  await expect(page.locator(".phase-count")).toHaveText("5.5");
  for (let phase = 0; phase < 12; phase++) await page.clock.fastForward(5500);
  await expect(
    page.getByRole("heading", { name: en.complete, exact: true }),
  ).toBeVisible();
  const notes: number[] = await page.evaluate(() => (window as any).played);
  expect(notes).toHaveLength(12);
  notes.forEach((frequency, index) =>
    expect(frequency).toBeCloseTo(index % 2 ? 261.63 : 392, 4),
  );
  await page.clock.runFor(20000);
  expect(await page.evaluate(() => (window as any).played.length)).toBe(12);
});
