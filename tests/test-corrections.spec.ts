import { test, expect } from "@playwright/test";
import en from "../src/locales/en.json" with { type: "json" };
import he from "../src/locales/he.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };

for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`group 1 ${language}: help attention is seen once and safety remains accessible`, async ({ page }) => {
    await page.addInitScript(language => {
      localStorage.setItem("breath-flow-language", language);
      if (!localStorage.getItem("still-settings")) localStorage.setItem("still-settings", JSON.stringify({ sound: "silent" }));
    }, language);
    await page.goto("./");
    const help = page.getByRole("button", { name: t.howToUse, exact: true });
    await expect(help).toHaveClass(/help-attention/);
    expect(await help.evaluate(el => getComputedStyle(el).animationName)).toBe("help-attention");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await help.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
    await help.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".help-safety h3")).toHaveText(t.helpSafetyTitle);
    for (const paragraph of t.helpSafetyBody.split("\n\n")) await expect(dialog.getByText(paragraph, { exact: true })).toHaveCount(1);
    expect(await dialog.evaluate(el => getComputedStyle(el).direction)).toBe(language === "he" ? "rtl" : "ltr");
    await expect(dialog.getByText(t.helpAdjustBody.split("\n\n")[0], { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
    await expect(help).not.toHaveClass(/help-attention/);
    await page.reload();
    await expect(help).not.toHaveClass(/help-attention/);
    await help.click(); await page.getByRole("button", { name: t.close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}
