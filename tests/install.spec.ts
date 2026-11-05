import { test, expect, type Page } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import he from '../src/locales/he.json' with { type: 'json' };
import ja from '../src/locales/ja.json' with { type: 'json' };
import { configureBreathing } from './configure-breathing';

test.use({ storageState: { cookies: [], origins: [] } });
async function setup(page: Page, options: { language?: string; consent?: string; eligible?: boolean; native?: boolean; outcome?: string; ua?: string; standalone?: boolean } = {}) {
  await page.addInitScript(options => {
    localStorage.setItem('breath-flow-language', options.language ?? 'en');
    if (options.consent && !localStorage.getItem('breath-flow-analytics-consent')) localStorage.setItem('breath-flow-analytics-consent', options.consent);
    if (options.eligible) localStorage.setItem('breath-flow-install-eligible', '1');
    localStorage.setItem('still-settings', JSON.stringify({ sound: 'silent', audioOutputVersion: 1, volume: 1 }));
    if (options.ua) Object.defineProperty(navigator, 'userAgent', { value: options.ua });
    if (options.standalone) Object.defineProperty(navigator, 'standalone', { value: true });
    (window as any).installRequests = 0;
    window.addEventListener('load', () => {
      if (options.native === false) return;
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: async () => { (window as any).installRequests++; },
        userChoice: Promise.resolve({ outcome: options.outcome ?? 'dismissed' }),
      });
      window.dispatchEvent(event);
      (window as any).installDefaultPrevented = event.defaultPrevented;
    });
  }, options);
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto('./');
  await expect(page.locator('.start-button')).toBeEnabled();
}
async function begin(page: Page) {
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.locator('.start-button').click();
  await page.clock.runFor(3020);
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase', '0');
}
for (const [language, t] of Object.entries({ en, he, ja })) {
  test(`${language}: only a started practice earns the localized invitation; dismissal persists`, async ({ page }) => {
    await setup(page, { language, consent: 'denied' });
    await expect(page.locator('.install-invitation')).toHaveCount(0);
    await page.locator('[data-home-choice="box"]').click();
    await expect(page.locator('.install-invitation')).toHaveCount(0);
    await begin(page);
    expect(await page.evaluate(() => localStorage.getItem('breath-flow-install-eligible'))).toBe('1');
    await expect(page.locator('.install-invitation')).toHaveCount(0);
    await page.getByRole('button', { name: t.stop, exact: true }).click();
    const notice = page.locator('.install-invitation');
    await expect(notice).toBeVisible(); await expect(notice.locator('h2')).toHaveText(t.installTitle);
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 640 });
      expect(await notice.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('button', { name: t.installAdd, exact: true })).toBeInViewport();
    }
    await page.screenshot({ path: `/tmp/breath-flow-install-${language}.png` });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    expect(await notice.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole('button', { name: t.installAdd, exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: t.installAdd, exact: true })).toBeInViewport();
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.getByRole('button', { name: t.installLater, exact: true }).click();
    await expect(notice).toHaveCount(0);
    await expect(page.locator('.start-button')).toBeFocused();
    await page.reload(); await expect(notice).toHaveCount(0);
    await page.getByRole('button', { name: t.howToUse, exact: true }).click();
    await expect(page.getByRole('dialog').getByText(t.installBrowserGuide, { exact: true })).toBeVisible();
  });
}
test('completion remains uninterrupted; returning home invites installation', async ({ page }) => {
  await setup(page, { consent: 'denied' });
  await configureBreathing(page, { rhythm: [15, 0, 15, 0], minutes: 1 });
  await begin(page); await page.clock.fastForward(60000);
  await expect(page.getByRole('heading', { name: en.complete, exact: true })).toBeVisible();
  await expect(page.locator('.install-invitation')).toHaveCount(0);
  await page.getByRole('button', { name: en.back, exact: true }).click();
  await expect(page.locator('.install-invitation')).toBeVisible();
});
test('Back from started practice invites; stopping during preparation does not', async ({ page }) => {
  await setup(page, { consent: 'denied' });
  await page.locator('.start-button').click();
  await page.getByRole('button', { name: en.stop, exact: true }).click();
  await expect(page.locator('.install-invitation')).toHaveCount(0);
  await begin(page); await page.goBack();
  await expect(page.locator('.install-invitation')).toBeVisible();
});
test('eligibility survives closing/reloading, consent UI always has priority', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: en.analyticsDecline, exact: true }).click();
  await begin(page);
  await page.evaluate(() => localStorage.removeItem('breath-flow-analytics-consent'));
  await page.clock.resume();
  await page.reload();
  await expect(page.locator('.analytics-notice')).toBeVisible();
  await expect(page.locator('.install-invitation')).toHaveCount(0);
  await page.getByRole('button', { name: en.analyticsDecline, exact: true }).click();
  await expect(page.locator('.install-invitation')).toBeVisible();
  await page.getByRole('button', { name: en.analyticsPreferences, exact: true }).click();
  await expect(page.locator('.analytics-notice')).toBeVisible();
  await expect(page.locator('.install-invitation')).toHaveCount(0);
});
for (const outcome of ['accepted', 'dismissed']) test(`native installation ${outcome} waits for a gesture and never claims success`, async ({ page }) => {
  await setup(page, { eligible: true, consent: 'denied', outcome });
  expect(await page.evaluate(() => (window as any).installDefaultPrevented)).toBe(true);
  expect(await page.evaluate(() => (window as any).installRequests)).toBe(0);
  await page.getByRole('button', { name: en.installAdd, exact: true }).click();
  expect(await page.evaluate(() => (window as any).installRequests)).toBe(1);
  await expect(page.locator('.install-invitation')).toHaveCount(0);
  expect(await page.evaluate(() => (window.dataLayer ?? []).map(value => Array.from(value as ArrayLike<any>)).filter(([command]) => command === 'event').length)).toBe(0);
});
for (const [ua, key] of [['iPhone Version/17 Safari/604.1', 'installSafariGuide'], ['Android Instagram', 'installBrowserGuide']] as const) test(`${ua}: manual instructions instead of a fictional install`, async ({ page }) => {
  await setup(page, { eligible: true, consent: 'denied', native: false, ua });
  await page.getByRole('button', { name: en.installAdd, exact: true }).click();
  await expect(page.locator('.install-invitation p')).toHaveText(en[key]);
  expect(await page.evaluate(() => (window as any).installRequests)).toBe(0);
  await expect(page.locator('#install-title')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.install-invitation')).toHaveCount(0);
});
test('unsupported browser and standalone installations have no invitation', async ({ page }) => {
  await setup(page, { eligible: true, consent: 'denied', native: false });
  await expect(page.locator('.install-invitation')).toHaveCount(0);
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.reload(); await expect(page.locator('.install-invitation')).toHaveCount(0);
});
test('appinstalled hides invitation and only consented GA records installation', async ({ page }) => {
  await setup(page, { eligible: true, consent: 'granted' });
  await expect(page.locator('.install-invitation')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.locator('.install-invitation')).toHaveCount(0);
  const events = await page.evaluate(() => (window.dataLayer ?? []).map(value => Array.from(value as ArrayLike<any>)).filter(([command, name]) => command === 'event' && name === 'pwa_installed'));
  expect(events).toHaveLength(1);
});


test('CSS standalone suppresses an eligible native invitation', async ({ page }) => {
  await page.addInitScript(() => {
    const match = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(display-mode: standalone)' ? { ...match(query), matches: true } as MediaQueryList : match(query);
  });
  await setup(page, { eligible: true, consent: 'denied' });
  expect(await page.evaluate(() => (window as any).installDefaultPrevented)).toBe(true);
  await expect(page.locator('.install-invitation')).toHaveCount(0);
});
