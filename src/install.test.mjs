import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installationGuide } from './install.ts';
test('installation guidance distinguishes Safari, iPad desktop mode, in-app browsers and Chromium', () => {
  assert.equal(installationGuide('iPhone Safari/604.1'), 'ios');
  assert.equal(installationGuide('Macintosh Safari/604.1', 5, 'MacIntel'), 'ios');
  assert.equal(installationGuide('iPhone CriOS/123'), 'browser');
  assert.equal(installationGuide('Android Instagram'), 'browser');
  assert.equal(installationGuide('Android Chrome/123'), null);
  assert.equal(installationGuide('Windows Chrome/123'), null);
});
