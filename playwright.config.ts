import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const production = process.env.PLAYWRIGHT_TEST_PRODUCTION === '1';
const url = 'http://127.0.0.1:5174/breathwork-app/';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: url,
    // Existing network-mocking tests exercise application logic directly. The
    // dedicated production PWA suite explicitly enables real service workers.
    serviceWorkers: 'block',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: production
      ? 'npm run preview -- --port 5174 --strictPort'
      : 'npm run dev -- --port 5174 --strictPort',
    url,
    reuseExistingServer: false,
  },
  reporter: 'list',
});
