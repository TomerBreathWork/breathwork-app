import { showRetainedAdvanced } from "./retained-advanced";
import { configureBreathing } from "./configure-breathing";
import { test as base, expect, type Page } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import en from "../src/locales/en.json" with { type: "json" };
import ja from "../src/locales/ja.json" with { type: "json" };

// Serve two real production precaches without rebuilding/dist mutation during
// concurrent tests. Only the HTML revision changes, just as on a deployment.
type Site = {
  url: string;
  release: (version: 1 | 2) => void;
  fail: (file: string | undefined) => void;
  requests: string[];
};
const test = base.extend<{ site: Site }>({
  site: async ({}, use) => {
    const root = resolve("dist");
    const index = readFileSync(join(root, "index.html"), "utf8");
    const script = readFileSync(join(root, "service-worker.js"), "utf8");
    const updatedIndex = index.replace(
      "</head>",
      '<meta name="test-release" content="two" /></head>',
    );
    const digest = (text: string) =>
      createHash("md5").update(text).digest("hex");
    expect(script).toContain(digest(index));
    const updatedScript =
      script.replaceAll(digest(index), digest(updatedIndex)) +
      "\n// release two\n";
    let version = 1,
      failedFile: string | undefined;
    const requests: string[] = [];
    const mime: Record<string, string> = {
      html: "text/html",
      js: "text/javascript",
      css: "text/css",
      svg: "image/svg+xml",
      png: "image/png",
      ico: "image/x-icon",
      webp: "image/webp",
      MP3: "audio/mpeg",
      json: "application/json",
      webmanifest: "application/manifest+json",
    };
    const server = createServer((request, response) => {
      const url = new URL(request.url!, "http://localhost");
      requests.push(url.pathname);
      if (!url.pathname.startsWith("/breathwork-app/")) {
        response.writeHead(404).end();
        return;
      }
      const file =
        decodeURIComponent(url.pathname.slice("/breathwork-app/".length)) ||
        "index.html";
      const path = resolve(root, file);
      if (!path.startsWith(root + sep) || file === failedFile) {
        response.writeHead(404).end();
        return;
      }
      try {
        const bytes =
          version === 2 && file === "index.html"
            ? updatedIndex
            : version === 2 && file === "service-worker.js"
              ? updatedScript
              : readFileSync(path);
        response.writeHead(200, {
          "Content-Type":
            mime[file.split(".").at(-1)!] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        response.end(bytes);
      } catch {
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address() as { port: number };
    await use({
      url: `http://127.0.0.1:${address.port}/breathwork-app/`,
      requests,
      release: (next) => {
        version = next;
      },
      fail: (file) => {
        failedFile = file;
      },
    });
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  },
});
test.use({ serviceWorkers: "allow", viewport: { width: 375, height: 812 } });
test.skip(
  process.env.PLAYWRIGHT_TEST_PRODUCTION !== "1",
  "PWA requires the production build.",
);

async function open(page: Page, url: string, sound = "silent") {
  await page.addInitScript(
    ({ sound }) => {
      if (!localStorage.getItem("still-settings"))
        localStorage.setItem(
          "still-settings",
          JSON.stringify({
            sound,
            preset: "coherentBreathing",
            rhythm: [5.5, 0, 5.5, 0],
            minutes: 1,
            volume: 0.25,
            background: "photo-3",
          }),
        );
    },
    { sound },
  );
  await page.goto(url);
  await configureBreathing(page, { minutes: 1 });
}
async function ready(page: Page) {
  await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
  await expect(page.locator(".app-view > [data-offline-status]")).toHaveAttribute(
    "data-offline-status",
    "offlineReady",
    { timeout: 15000 },
  );
  await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
}
async function checkForUpdate(page: Page) {
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())!.update();
  });
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await navigator.serviceWorker.getRegistration())?.waiting?.state,
      ),
    )
    .toBe("installed");
}

test("approved assets, initial HTML social metadata, icons and standalone manifest", async ({
  page,
  request,
  site,
}) => {
  const response = await request.get(site.url);
  const html = await response.text();
  expect(html).toContain(
    "<title>Breath Flow — Breathe. Be Present. Feel Better.</title>",
  );
  expect(html).toContain('name="twitter:card" content="summary_large_image"');
  for (const property of ["og:image", "og:url"])
    expect(html).toMatch(
      new RegExp(
        `property="${property}" content="https://tomerbreathwork.github.io/breathwork-app/`,
      ),
    );
  expect(html).toContain('content="1200"');
  expect(html).toContain('content="630"');
  const manifest = await (
    await request.get(site.url + "brand/app.webmanifest")
  ).json();
  expect(manifest).toMatchObject({
    name: "Breath Flow",
    short_name: "Breath Flow",
    description: "Breathe. Be Present. Feel Better.",
    start_url: "/breathwork-app/",
    scope: "/breathwork-app/",
    display: "standalone",
    theme_color: "#19484A",
    background_color: "#F6F1E8",
  });
  expect(
    manifest.icons.map((icon: { purpose: string }) => icon.purpose),
  ).toEqual(["any", "any", "maskable"]);
  for (const icon of manifest.icons)
    expect((await request.get(site.url + "brand/" + icon.src)).ok()).toBe(true);
  await open(page, site.url);
  await ready(page);
  await expect(page).toHaveTitle(
    "Breath Flow — Breathe. Be Present. Feel Better.",
  );
  await expect(page.locator(".brand-mark")).toHaveAttribute(
    "src",
    "/breathwork-app/brand/original-logo-transparent.png",
  );
  for (const selector of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
    for (const href of await page
      .locator(selector)
      .evaluateAll((els) => els.map((el) => (el as HTMLLinkElement).href)))
      expect((await request.get(href)).ok()).toBe(true);
  }
  await expect(page.locator(".brand-mark")).toHaveJSProperty(
    "naturalWidth",
    1236,
  );
});

test("offline reload retains settings, all photographs, decoded recordings and a full breathing cycle", async ({
  page,
  context,
  site,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, site.url, "recordings");
  await ready(page);
  await page.addInitScript(() => {
    (window as any).offlineVoices = 0;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      createBufferSource() {
        const source = super.createBufferSource(),
          start = source.start.bind(source);
        source.start = (...args) => {
          (window as any).offlineVoices++;
          start(...args);
        };
        return source;
      }
    };
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".settings-panel")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("still-settings")!).rhythm,
    ),
  ).toEqual([5.5, 0, 5.5, 0]);
  const assets = await page.evaluate(async () => {
    const paths = [1, 2, 3, 4, 5].map((i) => `media/backgrounds/${i}.webp`);
    const images = await Promise.all(
      paths.map(async (path) => {
        const image = new Image();
        image.src = new URL(path, location.href).href;
        await image.decode();
        return image.naturalWidth;
      }),
    );
    const audio = new AudioContext();
    const recordings = await Promise.all(
      ["inhale 4.MP3", "hold 4.MP3", "exhale 4.MP3", "bowls/low_F3_174Hz.mp3", "bowls/high_F4_349Hz.mp3", "bowls/mid_C4_262Hz.mp3", "bowls/warm_A3_218Hz.mp3"].map(async (file) => {
        const response = await fetch(
          new URL(`media/audio/${file.split("/").map(encodeURIComponent).join("/")}`, location.href),
        );
        return (await audio.decodeAudioData(await response.arrayBuffer()))
          .duration;
      }),
    );
    await audio.close();
    return { images, recordings };
  });
  assets.images.forEach((width) => expect(width).toBeGreaterThan(0));
  assets.recordings.forEach((duration) => expect(duration).toBeGreaterThan(0));
  // The real recorded-audio mode unlocks, loads and plays offline.
  await page.getByRole("button", { name: en.start, exact: true }).click();
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "preparation",
  );
  await expect(page.locator(".remaining-value")).toHaveText("01:06");
  expect(await page.evaluate(() => (window as any).offlineVoices)).toBe(0);
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "0",
    { timeout: 7000 },
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).offlineVoices))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: en.pause, exact: true }).click();
  const paused = await page.locator(".remaining-value").innerText();
  await page.waitForTimeout(250);
  await expect(page.locator(".remaining-value")).toHaveText(paused);
  await page.getByRole("button", { name: en.resume, exact: true }).click();
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-status",
    "running",
  );
  await page.getByRole("button", { name: en.restart, exact: true }).click();
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "preparation",
  );
  await page.getByRole("button", { name: en.stop, exact: true }).click();
  // Default synthesis also renders entirely offline, plus locale switching.
  await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
  await page
    .getByRole("combobox", { name: en.sound, exact: true })
    .selectOption("bowls");
  await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
  await page
    .getByRole("combobox", { name: en.language, exact: true })
    .selectOption("ja");
  await expect(page.locator(".phase-row > label:first-child")).toHaveText([
    "吸う",
    "止める",
    "吐く",
    "止める",
  ]);
  await page.getByRole("button", { name: ja.start, exact: true }).click();
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "0",
    { timeout: 10000 },
  );
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "2",
    { timeout: 7000 },
  );
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "0",
    { timeout: 7000 },
  );
  await page.getByRole("button", { name: ja.stop, exact: true }).click();
  await page.locator('[data-home-choice="explore"]').click();
  await expect(page.locator(".practice-card")).toHaveCount(5);
  await page.locator('[data-practice="equal"]').click();
  await expect(page.locator(".details-body")).toContainText(
    ja.equalExplanation,
  );
  await page.locator("#practice-base").fill("5.5");
  await page.locator("#duration").fill("1");
  await page.getByRole("button", { name: ja.start, exact: true }).click();
  await expect(page.locator(".phase-count")).toHaveText("3");
  await expect(page.locator(".breath-circle")).toHaveAttribute(
    "data-phase",
    "0",
    { timeout: 7000 },
  );
  await page.getByRole("button", { name: ja.stop, exact: true }).click();
  await expect(page.locator("[data-practice-detail]")).toHaveAttribute(
    "data-practice-detail",
    "equal",
  );
  await page.reload();
  await expect(page.locator(".app-page")).toHaveAttribute("lang", "ja");
  expect(errors).toEqual([]);
});

test("failed essential download never claims offline readiness; retry recovers", async ({
  page,
  site,
}) => {
  site.fail("media/audio/hold 4.MP3");
  await open(page, site.url);
  await showRetainedAdvanced(page); await page.getByRole("button", { name: en.advanced, exact: true }).click();
  await expect(page.locator(".app-view > [data-offline-status]")).toHaveAttribute(
    "data-offline-status",
    "offlineUnavailable",
    { timeout: 15000 },
  );
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(
    false,
  );
  site.fail(undefined);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator(".app-view > [data-offline-status]")).toHaveAttribute(
    "data-offline-status",
    "offlineReady",
    { timeout: 15000 },
  );
});

test("update waits through preparation and pause, then reloads safely and removes old HTML revision", async ({
  page,
  site,
}) => {
  await open(page, site.url);
  await ready(page);
  await configureBreathing(page, {
    preset: "custom",
    rhythm: [6.5, 1.5, 8, 0.5],
    minutes: 7,
  });
  await page.getByRole("button", { name: en.start, exact: true }).click();
  site.release(2);
  await checkForUpdate(page);
  // Explicit attempts must also be refused while busy, not just deferred by UI.
  await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration())!.waiting!.postMessage({
      type: "BREATH_FLOW_ACTIVATE_IF_IDLE",
    }),
  );
  await page.waitForTimeout(200);
  await expect(page.locator('meta[name="test-release"]')).toHaveCount(0);
  await expect(page.locator(".session-panel")).toBeVisible();
  await page.getByRole("button", { name: en.pause, exact: true }).click();
  const count = await page.locator(".phase-count").innerText();
  await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration())!.waiting!.postMessage({
      type: "BREATH_FLOW_ACTIVATE_IF_IDLE",
    }),
  );
  await page.waitForTimeout(200);
  await expect(page.locator(".phase-count")).toHaveText(count);
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          !!(await navigator.serviceWorker.getRegistration())!.waiting,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: en.stop, exact: true }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    "content",
    "two",
    { timeout: 10000 },
  );
  await expect(page.locator(".settings-panel")).toBeVisible();
  await expect(page.locator("#duration")).toHaveValue("7");
  for (const [i, value] of [6.5, 1.5, 8, 0.5].entries())
    await expect(page.locator(`#phase-value-${i}`)).toHaveValue(String(value));
  await expect(page.locator('[data-home-choice="custom"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const htmlKeys = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((request) => request.url),
        ),
      )
    )
      .flat()
      .filter((url) => url.includes("index.html")),
  );
  expect(htmlKeys).toHaveLength(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("still-settings")!).volume,
    ),
  ).toBe(0.25);
  await page.reload();
  await expect(page.locator("#duration")).toHaveValue("7");
  await expect(page.locator("#phase-value-0")).toHaveValue("6.5");
  await expect(page.locator(".settings-panel")).toHaveAttribute("data-selected-practice", "custom");
});

test("a second practicing tab blocks an idle tab update; closing it allows eventual activation", async ({
  page,
  context,
  site,
}) => {
  await open(page, site.url);
  await ready(page);
  const second = await context.newPage();
  await open(second, site.url);
  await second.getByRole("button", { name: en.start, exact: true }).click();
  await second.getByRole("button", { name: en.pause, exact: true }).click();
  site.release(2);
  await checkForUpdate(page);
  await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration())!.waiting!.postMessage({
      type: "BREATH_FLOW_ACTIVATE_IF_IDLE",
    }),
  );
  await page.waitForTimeout(300);
  await expect(page.locator('meta[name="test-release"]')).toHaveCount(0);
  await expect(second.locator(".session-panel")).toBeVisible();
  // The tabs intentionally have different schedules. The idle tab's update
  // must preserve its own configuration rather than the last localStorage writer.
  await configureBreathing(page, { preset: "boxBreathing", minutes: 7 });
  await showRetainedAdvanced(second);
  await second.getByRole("button", { name: en.advanced, exact: true }).click();
  await second
    .getByRole("slider", { name: en.volume, exact: true })
    .fill("0.3");
  await second.close();
  // Returning focus is one of the normal retry triggers (also online/60s).
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    "content",
    "two",
    { timeout: 10000 },
  );
  await expect(page.locator("#duration")).toHaveValue("7");
  await expect(page.locator(".settings-panel")).toHaveAttribute(
    "data-selected-practice",
    "box",
  );
});

test("a practice started during activation defers the reload until Stop", async ({
  page,
  site,
}) => {
  await open(page, site.url);
  await ready(page);
  await page.evaluate(() => {
    let started = false;
    // The manager has just replied idle. Start in this same task, before the
    // worker can act on that reply, to exercise the final controllerchange guard.
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "BREATH_FLOW_CAN_UPDATE" && !started) {
        started = true;
        (document.querySelector(".start-button") as HTMLButtonElement).click();
      }
    });
  });
  site.release(2);
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())!.update();
  });
  await expect(page.locator(".session-panel")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = (await navigator.serviceWorker.getRegistration())!;
        return (
          !!registration.active &&
          !registration.waiting &&
          !registration.installing
        );
      }),
    )
    .toBe(true);
  await expect(page.locator('meta[name="test-release"]')).toHaveCount(0);
  await page.getByRole("button", { name: en.stop, exact: true }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    "content",
    "two",
    { timeout: 10000 },
  );
});

test("full-cycle completion releases a waiting update without interrupting the timer", async ({
  page,
  site,
}) => {
  await open(page, site.url);
  await ready(page);
  await page.clock.install({ time: new Date("2026-10-25T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-25T12:00:01Z"));
  await page.getByRole("button", { name: en.start, exact: true }).click();
  site.release(2);
  await checkForUpdate(page);
  await page.clock.runFor(3020);
  await expect(page.locator(".remaining-value")).toHaveText("01:06");
  await page.clock.fastForward(65000);
  await expect(page.locator(".remaining-value")).toHaveText("00:01");
  await expect(page.locator('meta[name="test-release"]')).toHaveCount(0);
  await page.clock.fastForward(1000);
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    "content",
    "two",
    { timeout: 10000 },
  );
  await expect(page.locator(".settings-panel")).toBeVisible();
});
