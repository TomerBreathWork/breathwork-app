import { test, expect } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };

const line = 'https://line.me/ti/p/dDHE5dIChq';
const app = 'https://tomerbreathwork.github.io/breathwork-app/';
const message = '呼吸を整える時間を、毎日の暮らしに。\n\nBreath Flowは、自分のペースで気軽に呼吸を練習できるアプリです。よかったら試してみてください🌿';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('breath-flow-language', 'ja');
    localStorage.setItem('still-settings', JSON.stringify({ sound: 'silent' }));
  });
});

test('contact follows the current language immediately, preserving its icon and native external-link behavior', async ({ page, context }) => {
  const requests: { url: string; method: string }[] = [];
  await context.route('https://line.me/**', route => {
    requests.push({ url: route.request().url(), method: route.request().method() });
    return route.fulfill({ contentType: 'text/html', body: '<title>External LINE handoff</title>' });
  });
  await page.goto('./');
  const icon = await page.getByRole('link', { name: ja.contact, exact: true }).locator('svg').innerHTML();
  for (const [language, t] of Object.entries({ ja, en, he })) {
    await page.locator('.language-picker select').selectOption(language);
    const contact = page.getByRole('link', { name: t.contact, exact: true });
    const url = new URL((await contact.getAttribute('href'))!);
    if (language === 'ja') expect(url.href).toBe(line);
    else {
      expect(url.origin + url.pathname).toBe('https://wa.me/972509266969');
      expect(url.searchParams.get('text')).toBe(t.contactMessage);
    }
    expect(await contact.locator('svg').innerHTML()).toBe(icon);
    await expect(contact).toHaveAttribute('target', '_blank');
    await expect(contact).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await page.locator('.language-picker select').selectOption('ja');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: ja.contact, exact: true }).click()]);
  await popup.waitForLoadState(); expect(popup.url()).toBe(line);
  expect(requests).toEqual([{ url: line, method: 'GET' }]);
  await popup.close();
});

test('Japanese native sharing has the exact approved paragraphs and supplies the app URL only once', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { (window as any).shared = data; } }));
  await page.goto('./'); await page.getByRole('button', { name: ja.share, exact: true }).click();
  const shared = await page.evaluate(() => (window as any).shared);
  expect(shared).toEqual({ title: 'Breath Flow', text: message, url: app });
  expect([shared.text, shared.url].join('\n\n').split(app)).toHaveLength(2);
  expect(shared.text).not.toContain('https://');
  expect(shared.text).not.toContain('line.me');
});

test('Japanese sharing retains the existing copy-link fallback when native sharing is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).copied = text; } } });
  });
  await page.goto('./'); await page.getByRole('button', { name: ja.share, exact: true }).click();
  await expect(page.getByRole('textbox', { name: ja.appLink, exact: true })).toHaveValue(app);
  await page.getByRole('button', { name: ja.copyLink, exact: true }).click();
  expect(await page.evaluate(() => (window as any).copied)).toBe(app);
  await expect(page.getByRole('status')).toHaveText(ja.linkCopied);
});
