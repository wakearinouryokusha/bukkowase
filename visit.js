'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const STAY_MS = 5000;      // ページ読み込み後の滞在時間
const TIMEOUT_MS = 30000;  // ページ読み込みのタイムアウト

function readTargetUrls() {
  if (process.env.TARGET_URLS) {
    return process.env.TARGET_URLS
      .replace(/\r/g, '')
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url && !url.startsWith('#'));
  }

  if (process.env.TARGET_URL) {
    return [process.env.TARGET_URL.trim()];
  }

  const file = path.join(__dirname, 'config', 'url.txt');

  if (!fs.existsSync(file)) return [];

  return fs.readFileSync(file, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .map((url) => url.trim())
    .filter((url) => url && !url.startsWith('#'));
}

(async () => {
const urls = readTargetUrls();

if (urls.length === 0) {
  console.error('config/url.txt にURLが登録されていません。');
  process.exitCode = 1;
  return;
}

const invalidUrl = urls.find(
  (url) => !/^https?:\/\//i.test(url)
);

if (invalidUrl) {
  console.error(`不正なURLです: ${invalidUrl}`);
  process.exitCode = 1;
  return;
}

// GitHub Actionsの実行番号から訪問先を決定
const runNumber = Math.max(
  1,
  Number.parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10) || 1
);

const targetIndex = (runNumber - 1) % urls.length;
const url = urls[targetIndex];

console.log(
  `実行番号: ${runNumber} / 訪問先: ${targetIndex + 1}/${urls.length}`
);
