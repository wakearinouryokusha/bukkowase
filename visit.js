const fs = require('node:fs');
const { chromium } = require('playwright');

const TARGET_FILE = process.env.TARGET_FILE || 'config/url.txt';
const TIMEOUT_MS = Number(process.env.PAGE_TIMEOUT_MS || 30000);
const WAIT_AFTER_LOAD_MS = Number(process.env.WAIT_AFTER_LOAD_MS || 5000);

function readTargetUrl() {
  const text = fs.readFileSync(TARGET_FILE, 'utf8');
  const url = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#'));

  if (!url) {
    throw new Error('訪問先URLが未設定です。Actions > Set target URL で登録してください。');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`URLの形式が不正です: ${url}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(`URLは http:// または https:// の完全なURLにしてください: ${url}`);
  }

  return parsed.toString();
}

(async () => {
  const targetUrl = readTargetUrl();
  console.log(`対象URL: ${targetUrl}`);
  console.log('Playwright Chromiumを起動します。');

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[page console error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`[page error] ${error.message}`);
    });

    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT_MS,
    });

    // SPAやJavaScript中心のサイトでも「ブラウザで開いた」状態に少し滞在する。
    await page.waitForTimeout(WAIT_AFTER_LOAD_MS);

    const title = await page.title().catch(() => '');
    const finalUrl = page.url();
    const status = response ? response.status() : 'no-response';
    const contentType = response ? (response.headers()['content-type'] || '') : '';

    console.log(`訪問完了: HTTP ${status}`);
    console.log(`最終URL: ${finalUrl}`);
    console.log(`タイトル: ${title}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`滞在時間: ${WAIT_AFTER_LOAD_MS} ms`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(`訪問失敗: ${error.stack || error}`);
  process.exit(1);
});
