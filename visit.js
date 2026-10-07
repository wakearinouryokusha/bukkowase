'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const STAY_MS = 5000;      // ページ読み込み後の滞在時間
const TIMEOUT_MS = 30000;  // ページ読み込みのタイムアウト

function readTargetUrl() {
  if (process.env.TARGET_URL) return process.env.TARGET_URL.trim();
  const file = path.join(__dirname, 'config', 'url.txt');
  if (!fs.existsSync(file)) return '';
  const line = fs.readFileSync(file, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  return line || '';
}

(async () => {
  const url = readTargetUrl();
  if (!url) {
    console.log('config/url.txt にURLがありません。Actionsの「Set target URL」でURLを設定してください。');
    return;
  }
  if (!/^https?:\/\//i.test(url)) {
    console.error(`http/https以外のURLは開けません: ${url}`);
    process.exitCode = 1;
    return;
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });
    const page = await context.newPage();
    const res = await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT_MS });
    await page.waitForTimeout(STAY_MS);
    const status = res ? res.status() : 'n/a';
    console.log(`${new Date().toISOString()} ${url} -> ${status} "${await page.title()}"`);
    if (res && res.status() >= 400) process.exitCode = 1;
  } catch (e) {
    console.error(`失敗: ${url}: ${e.message}`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
