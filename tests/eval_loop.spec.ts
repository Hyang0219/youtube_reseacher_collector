import { test, expect, chromium } from '@playwright/test';
import type { Capture } from '../src/services/storage';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAhaMarkdown } from '../src/services/templates';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const USER_DATA = path.resolve(
  __dirname,
  '../tmp/playwright-user-data'
);
const SIGNED_USER_DATA = process.env.PLAYWRIGHT_SIGNED_USER_DATA;
const VIDEO_URL = 'https://www.youtube.com/watch?v=8VRW3J2lzrQ'; // replace with any public URL
const RESULTS_DIR = path.resolve(__dirname, 'results');

test('build, load extension, capture, and export markdown', async () => {
  execSync('npm run build', { stdio: 'inherit' });

  if (!SIGNED_USER_DATA) {
    if (fs.existsSync(USER_DATA)) {
      fs.rmSync(USER_DATA, { recursive: true, force: true });
    }
  }

  const browser = await test.step('launch chromium with extension', async () => {
    return await chromium.launchPersistentContext(SIGNED_USER_DATA ?? USER_DATA, {
      headless: false,
      args: [
        `--disable-extensions-except=${DIST_DIR}`,
        `--load-extension=${DIST_DIR}`
      ],
      viewport: { width: 1280, height: 720 }
    });
  });

  await browser.addInitScript(() => {
    window.chrome?.storage?.local?.set?.({
      apiSettings: { aiBuilderToken: process.env.AI_BUILDER_TOKEN || 'test-token' }
    });
  });

  const page = await browser.newPage();
  await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded' });

  try {
    const rejectCookie = await page.waitForSelector(
      'button:has-text("Reject all")',
      { timeout: 8000 }
    );
    await rejectCookie?.click();
  } catch {
    // cookie banner not shown
  }
  try {
    const skipButton = page.locator('button.ytp-ad-skip-button');
    await skipButton.click({ timeout: 12000 });
  } catch {
    // no ad appeared
  }
  await page.keyboard.press('k'); // ensure player ready

  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = 60;
    }
  });

  await page.keyboard.press('Alt+c');
  await page.waitForTimeout(3000);

  await page.waitForFunction(() => typeof window.chrome !== 'undefined' && !!window.chrome.storage?.local, {
    timeout: 15000
  });
  const captures = (await page.evaluate(async () => {
    return new Promise<Capture[]>((resolve) => {
      chrome.storage.local.get(['captures'], (result: { captures?: Capture[] }) => {
        resolve(result.captures ?? []);
      });
    });
  })) as Capture[];

  expect(Array.isArray(captures)).toBe(true);
  expect(captures.length).toBeGreaterThan(0);

  const newest = captures[captures.length - 1];
  const markdown = renderAhaMarkdown(newest);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESULTS_DIR, 'latest-capture.md'), markdown, 'utf8');

  await browser.close();
});
