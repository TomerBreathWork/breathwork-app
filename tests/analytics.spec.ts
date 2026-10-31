import { test, expect, type Page } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };
import { ANALYTICS_CONSENT_KEY, GA_MEASUREMENT_ID } from '../src/analytics';

test.use({ storageState: { cookies: [], origins: [] } });
test.skip(process.env.PLAYWRIGHT_TEST_PRODUCTION !== '1', 'Analytics only runs in production builds.');
const calls = (page: Page) => page.evaluate(() => (window.dataLayer ?? []).map(value => Array.from(value as ArrayLike<any>)));
const events = async (page: Page, name?: string) => (await calls(page)).filter(([command, event]) => command === 'event' && (!name || event === name));
async function saved(page: Page, choice?: string, language = 'en') {
  await page.addInitScript(({ choice, language, key }) => {
    if (choice && !localStorage.getItem(key)) localStorage.setItem(key, choice);
    localStorage.setItem('breath-flow-language', language);
    if (!localStorage.getItem('still-settings')) localStorage.setItem('still-settings', JSON.stringify({ sound: 'silent', minutes: 1 }));
  }, { choice, language, key: ANALYTICS_CONSENT_KEY });
}
test.beforeEach(async ({ context }) => {
  await context.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'text/javascript', body: 'window.__mockGoogleTagLoaded = true;' }));
  await context.route('https://*.google-analytics.com/**', route => route.abort());
  await context.route('https://wa.me/**', route => route.abort());
});
for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: consent defaults off, can be declined/changed/revoked, and never changes existing preferences`, async ({ page }) => {
    const requests: string[] = [], errors: string[] = [];
    page.on('request', request => { if (/googletagmanager|google-analytics/.test(request.url())) requests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await saved(page, undefined, language); await page.goto('./');
    await expect(page.locator('.analytics-notice')).toBeVisible();
    expect(requests).toEqual([]); expect(await events(page)).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'he' ? 'rtl' : 'ltr');
    for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      const notice = page.locator('.analytics-notice');
      expect(await notice.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(page.getByRole('button', { name: t.analyticsDecline, exact: true })).toBeInViewport();
      await expect(page.getByRole('button', { name: t.analyticsAllow, exact: true })).toBeInViewport();
      if (viewport.width === 375) await page.screenshot({ path: `/tmp/breath-flow-analytics-consent-${language}.png` });
    }
    const before = await page.evaluate(() => localStorage.getItem('still-settings'));
    await page.getByRole('button', { name: t.analyticsDecline, exact: true }).click();
    await expect(page.locator('.analytics-notice')).toHaveCount(0);
    expect(requests).toEqual([]); expect(await events(page)).toEqual([]);
    await page.reload(); await expect(page.locator('.analytics-notice')).toHaveCount(0);
    await page.getByRole('button', { name: t.analyticsPreferences, exact: true }).click();
    await page.getByRole('button', { name: t.analyticsAllow, exact: true }).click();
    await expect.poll(async () => (await events(page, 'app_opened')).length).toBe(1);
    await expect.poll(() => requests.length).toBe(1);
    const config = (await calls(page)).filter(([command]) => command === 'config');
    expect(config).toHaveLength(1); expect(config[0][1]).toBe(GA_MEASUREMENT_ID);
    expect(config[0][2].send_page_view).toBe(false);
    expect(await events(page, 'page_view')).toHaveLength(1);
    expect(await page.evaluate(() => localStorage.getItem('still-settings'))).toBe(before);
    await page.evaluate(() => { document.cookie = 'bf_ga4_ga=test;path=/breathwork-app/'; });
    await page.getByRole('button', { name: t.analyticsPreferences, exact: true }).click();
    await page.getByRole('button', { name: t.analyticsDecline, exact: true }).click();
    const count = (await events(page)).length;
    await page.locator('[data-home-choice="box"]').click(); await page.locator('[data-home-choice="explore"]').click();
    expect((await events(page)).length).toBe(count);
    expect(await page.evaluate(id => (window as any)[`ga-disable-${id}`], GA_MEASUREMENT_ID)).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain('bf_ga4_ga=');
    expect(errors).toEqual([]);
  });
}

test('Strict Mode, language changes and repeated selections do not duplicate opens, views or events; contact contains no URL/message', async ({ page, context }) => {
  await saved(page, 'granted');
  await page.goto('./?email=private@example.test&analytics_debug=1#private');
  await expect(page.locator('.start-button')).toBeEnabled();
  expect(await events(page, 'app_opened')).toHaveLength(1); expect(await events(page, 'page_view')).toHaveLength(1);
  await page.locator('.language-picker select').selectOption('ja');
  expect(await events(page, 'page_view')).toHaveLength(1);
  await page.locator('[data-home-choice="box"]').click(); await page.locator('[data-home-choice="box"]').click();
  expect(await events(page, 'practice_selected')).toHaveLength(1);
  await page.locator('[data-home-choice="explore"]').click(); await page.locator('[data-practice="extended"]').click();
  expect((await events(page, 'practice_selected')).map(([, , p]) => p.practice_id)).toEqual(['box', 'extended']);
  await page.goBack(); await page.goBack();
  await page.getByRole('link', { name: ja.contact, exact: true }).click();
  expect(await events(page, 'contact_clicked')).toHaveLength(1);
  const serialized = JSON.stringify(await calls(page));
  expect(serialized).not.toContain('private@example.test'); expect(serialized).not.toContain('wa.me');
  expect(serialized).not.toContain('972509266969'); expect(serialized).not.toContain(ja.contactMessage);
  const config = (await calls(page)).find(([command]) => command === 'config'); expect(config![2].debug_mode).toBe(true);
  for (const [, , params] of await events(page)) {
    expect(params.page_location).toMatch(/^https:\/\/tomerbreathwork\.github\.io\/breathwork-app\/#(?:settings|library|details\/extended)$/);
    expect(params.page_referrer).toBe(''); expect(params.language).toMatch(/^(en|he|ja)$/);
  }
  for (const popup of context.pages()) if (popup !== page) await popup.close();
  await page.reload(); await expect(page.locator('.start-button')).toBeEnabled();
  expect(await events(page, 'app_opened')).toHaveLength(1); expect(await events(page, 'page_view')).toHaveLength(1);
});

test('start follows silent preparation; pause/resume, restart, completion and stop have exactly one correct event', async ({ page }) => {
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await saved(page, 'granted'); await page.goto('./');
  await page.getByRole('button', { name: en.start, exact: true }).click();
  await expect(page.locator('.analytics-notice')).toHaveCount(0); await expect(page.locator('.analytics-preferences')).toHaveCount(0);
  await page.clock.runFor(2990); expect(await events(page, 'practice_started')).toHaveLength(0);
  await page.clock.runFor(30); expect(await events(page, 'practice_started')).toHaveLength(1);
  expect((await events(page, 'practice_started'))[0][2]).toMatchObject({ practice_id: 'coherent', practice_name: 'Coherent Breathing', duration_seconds: 66 });
  await page.getByRole('button', { name: en.pause, exact: true }).click(); await page.clock.runFor(5000);
  expect(await events(page, 'practice_completed')).toHaveLength(0);
  await page.getByRole('button', { name: en.resume, exact: true }).click(); await page.clock.runFor(2000);
  expect(await events(page, 'practice_started')).toHaveLength(1);
  await page.getByRole('button', { name: en.restart, exact: true }).click();
  expect(await events(page, 'practice_stopped')).toHaveLength(1);
  expect((await events(page, 'practice_stopped'))[0][2].duration_seconds).toBeLessThan(3);
  await page.clock.runFor(3020); expect(await events(page, 'practice_started')).toHaveLength(2);
  await page.clock.fastForward(66000); await page.clock.runFor(32);
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-status', 'completed');
  expect(await events(page, 'practice_completed')).toHaveLength(1);
  await page.getByRole('button', { name: en.stop, exact: true }).click();
  expect(await events(page, 'practice_stopped')).toHaveLength(1);
  await page.getByRole('button', { name: en.start, exact: true }).click();
  await page.clock.runFor(1000); await page.getByRole('button', { name: en.stop, exact: true }).click();
  expect(await events(page, 'practice_started')).toHaveLength(2); expect(await events(page, 'practice_stopped')).toHaveLength(1);
});

for (const standalone of ['css', 'ios']) test(`${standalone}: standalone launch and supported installation signal are tracked once`, async ({ page }) => {
  await saved(page, 'granted');
  await page.addInitScript(standalone => {
    if (standalone === 'ios') Object.defineProperty(navigator, 'standalone', { value: true });
    else { const match = window.matchMedia.bind(window); window.matchMedia = query => query === '(display-mode: standalone)' ? { ...match(query), matches: true } as MediaQueryList : match(query); }
  }, standalone);
  await page.goto('./'); await expect(page.locator('.start-button')).toBeEnabled();
  expect((await events(page, 'app_opened'))[0][2].display_mode).toBe('standalone');
  await page.evaluate(() => { window.dispatchEvent(new Event('appinstalled')); window.dispatchEvent(new Event('appinstalled')); });
  expect(await events(page, 'pwa_installed')).toHaveLength(1);
});

test('a blocked Google tag never prevents breathing and consent cannot interrupt practice', async ({ page, context }) => {
  await context.unroute('https://www.googletagmanager.com/**');
  await context.route('https://www.googletagmanager.com/**', route => route.abort());
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await saved(page, 'granted'); await page.goto('./');
  await page.getByRole('button', { name: en.start, exact: true }).click(); await page.clock.runFor(3020);
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase', '0');
  await expect(page.locator('.analytics-notice')).toHaveCount(0);
  await page.getByRole('button', { name: en.stop, exact: true }).click();
  await expect(page.locator('.settings-panel')).toBeVisible(); expect(errors).toEqual([]);
});
