import { test, expect, type Page } from "@playwright/test";
import en from "../src/locales/en.json" with { type: "json" };
import he from "../src/locales/he.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };
const dictionaries = { en, he, ja };
const publicUrl = "https://tomerbreathwork.github.io/breathwork-app/";
const messages = {
  en: "Hi Tomer, I've been using the Breath Flow app, and I'd love to learn more about breathwork therapy.",
  he: "שלום תומר, השתמשתי באפליקציית Breath Flow, ומעניין אותי לשמוע עוד על תרפיה בנשימה.",
  ja: "トメルさん、こんにちは。Breath Flowアプリを使ってみました。呼吸セラピーについて、もう少し詳しくお話を聞いてみたいです。",
};
async function settings(
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
for (const [language, t] of Object.entries(dictionaries)) {
  test(`${language}: four exact preset names in a single mobile row, contact, native share and accessible localized help`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data: ShareData) => {
          (window as any).shared = data;
        },
      }),
    );
    await settings(page, language);
    await expect(page.locator(".presets button")).toHaveText([
      "Coherent Breath",
      "Box Breath",
      "4-7-8",
      "Custom",
    ]);
    await expect(
      page.getByRole("button", { name: "Coherent Breath", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const boxes = await page.locator(".presets button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const b = button.getBoundingClientRect();
        return { x: b.x, y: b.y, height: b.height };
      }),
    );
    expect(new Set(boxes.map((box) => box.y)).size).toBe(1);
    boxes.forEach((box, i) => {
      expect(box.height).toBeGreaterThanOrEqual(44);
      if (i) expect(box.x).toBeGreaterThan(boxes[i - 1].x);
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(375);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBe(812);
    const contact = page.getByRole("link", { name: t.contact, exact: true });
    const url = new URL((await contact.getAttribute("href"))!);
    expect(url.origin + url.pathname).toBe("https://wa.me/972509266969");
    expect(url.searchParams.get("text")).toBe(
      messages[language as keyof typeof messages],
    );
    await expect(contact).toHaveAttribute("target", "_blank");
    await page.getByRole("button", { name: t.share, exact: true }).click();
    expect(await page.evaluate(() => (window as any).shared)).toEqual({
      title: "Breath Flow",
      text: t.shareMessage,
      url: publicUrl,
    });
    const help = page.getByRole("button", { name: t.howToUse, exact: true });
    await help.click();
    const dialog = page.getByRole("dialog", { name: t.helpTitle, exact: true });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: t.close, exact: true }),
    ).toBeFocused();
    for (const text of [
      t.helpIntro,
      t.helpChooseTitle,
      t.helpAdjustTitle,
      t.helpLengthTitle,
      t.helpStartTitle,
      t.helpImportantTitle,
      ...t.helpImportantBody.split("\n\n"),
    ])
      await expect(dialog.getByText(text, { exact: true })).toHaveCount(1);
    expect(await dialog.evaluate((el) => getComputedStyle(el).direction)).toBe(
      language === "he" ? "rtl" : "ltr",
    );
    expect(
      await dialog
        .locator(".help-body")
        .evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator(".help-body")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("button", { name: t.close, exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(help).toBeFocused();
    await help.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: t.close, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(help).toBeFocused();
  });
}
for (const [key, name, rhythm] of [
  ["coherentBreathing", "Coherent Breath", [5.5, 0, 5.5, 0]],
  ["boxBreathing", "Box Breath", [4, 4, 4, 4]],
  ["eveningUnwind", "4-7-8", [4, 7, 8, 0]],
  ["custom", "Custom", [6.5, 1, 8, 0.5]],
  ["slowSteady", "Custom", [4, 0, 6, 0]],
] as const)
  test(`saved ${key} restores its selected button and durations`, async ({
    page,
  }) => {
    await settings(page, "en", {
      preset: key,
      rhythm,
      minutes: 7,
      sound: "silent",
      background: "photo-5",
      volume: 0.25,
    });
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    for (let i = 0; i < 4; i++)
      await expect(page.locator(`#phase-${i}`)).toHaveValue(String(rhythm[i]));
    await expect(page.locator("#duration")).toHaveValue("7");
    await page.reload();
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
test("editing only switches to Custom when necessary, and the last Custom rhythm survives preset switches and reload", async ({
  page,
}) => {
  await settings(page);
  const inhale = page.getByRole("spinbutton", {
    name: "Inhale seconds",
    exact: true,
  });
  await inhale.fill("5.5");
  await expect(
    page.getByRole("button", { name: "Coherent Breath", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await inhale.fill("6.5");
  await page
    .getByRole("spinbutton", { name: "Hold after inhale seconds", exact: true })
    .fill("1.5");
  await expect(
    page.getByRole("button", { name: "Custom", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Box Breath", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Box Breath", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "4-7-8", exact: true }).click();
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await expect(inhale).toHaveValue("6.5");
  await expect(page.locator("#phase-1")).toHaveValue("1.5");
  await page.reload();
  await expect(inhale).toHaveValue("6.5");
  await expect(
    page.getByRole("button", { name: "Custom", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("unsupported native sharing offers clipboard copy and the confirmation follows language changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as any).copied = text;
        },
      },
    });
  });
  await settings(page);
  await page.getByRole("button", { name: en.share, exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: en.appLink, exact: true }),
  ).toHaveValue(publicUrl);
  await page.getByRole("button", { name: en.copyLink, exact: true }).click();
  expect(await page.evaluate(() => (window as any).copied)).toBe(publicUrl);
  await expect(page.locator(".footer-status")).toHaveText(en.linkCopied);
  await page.locator(".language-picker select").selectOption("he");
  await expect(page.locator(".footer-status")).toHaveText(he.linkCopied);
});
for (const clipboard of ["missing", "denied"])
  test(`manual link selection remains available when clipboard is ${clipboard}`, async ({
    page,
  }) => {
    await page.addInitScript((clipboard) => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value:
          clipboard === "missing"
            ? undefined
            : {
                writeText: async () => {
                  throw new DOMException("Denied", "NotAllowedError");
                },
              },
      });
    }, clipboard);
    await settings(page, "ja");
    await page.getByRole("button", { name: ja.share, exact: true }).click();
    await page.getByRole("button", { name: ja.copyLink, exact: true }).click();
    await expect(page.locator(".footer-status")).toHaveText(ja.copyManually);
    expect(
      await page
        .getByRole("textbox", { name: ja.appLink, exact: true })
        .evaluate((el: HTMLInputElement) =>
          el.value.slice(el.selectionStart!, el.selectionEnd!),
        ),
    ).toBe(publicUrl);
  });
test("native share cancellation is quiet; other failures offer the copy fallback", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    }),
  );
  await settings(page);
  await page.getByRole("button", { name: en.share, exact: true }).click();
  await expect(page.locator(".share-fallback")).toHaveCount(0);
  await expect(page.locator(".footer-status")).toHaveText("");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      value: async () => {
        throw new DOMException("Unavailable", "NotAllowedError");
      },
    }),
  );
  await page.getByRole("button", { name: en.share, exact: true }).click();
  await expect(
    page.getByRole("button", { name: en.copyLink, exact: true }),
  ).toBeVisible();
});
test("Japanese holds show only 止める while water stays stationary and the phase order remains intact", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-24T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-24T12:00:01Z"));
  await settings(page, "ja", {
    preset: "boxBreathing",
    rhythm: [4, 4, 4, 4],
    minutes: 1,
    sound: "silent",
  });
  await page.getByRole("button", { name: ja.start, exact: true }).click();
  await page.clock.runFor(5020);
  for (const [advance, title, phase, fill] of [
    [0, "吸う", "0", null],
    [4000, "止める", "1", "height: 100%;"],
    [4000, "吐く", "2", null],
    [4000, "止める", "3", "height: 0%;"],
  ] as const) {
    if (advance) await page.clock.runFor(advance);
    await expect(page.locator(".breath-circle")).toHaveAttribute(
      "data-phase",
      phase,
    );
    await expect(page.locator(".circle-label h2")).toHaveText(title);
    await expect(page.locator(".circle-label small")).toHaveCount(0);
    if (fill)
      await expect(page.locator(".water")).toHaveAttribute("style", fill);
  }
});
