'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TIMEOUT_MS = 30000;
const RENDER_WAIT_MS = 1000;

// 一般的なアクセス解析・広告計測サービス
const TRACKING_HOSTS = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'googleadservices.com',
  'connect.facebook.net',
  'clarity.ms',
  'hotjar.com',
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'amplitude.com',
  'plausible.io',
  'umami.is',
  'posthog.com',
  'heapanalytics.com',
  'fullstory.com'
];

// URL一覧を読み込む
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

  if (!fs.existsSync(file)) {
    return [];
  }

  return fs.readFileSync(file, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .map((url) => url.trim())
    .filter((url) => url && !url.startsWith('#'));
}

// URL形式を確認する
function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' ||
      parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// 解析・広告計測リクエストか確認する
function isTrackingRequest(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    const blockedHost = TRACKING_HOSTS.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );

    const facebookPixel =
      hostname === 'facebook.com' &&
      /^\/tr(?:\/|$)/.test(parsed.pathname);

    return blockedHost || facebookPixel;
  } catch {
    return false;
  }
}

(async () => {
  const urls = readTargetUrls();

  // URL未登録
  if (urls.length === 0) {
    console.error(
      'config/url.txt にURLが登録されていません。'
    );
    process.exitCode = 1;
    return;
  }

  // URL形式の確認
  const invalidUrl = urls.find(
    (url) => !isValidUrl(url)
  );

  if (invalidUrl) {
    console.error(`不正なURLです: ${invalidUrl}`);
    process.exitCode = 1;
    return;
  }

  // GitHub Actionsの実行番号
  const parsedRunNumber = Number(
    process.env.GITHUB_RUN_NUMBER || '1'
  );

  const runNumber =
    Number.isSafeInteger(parsedRunNumber) &&
    parsedRunNumber > 0
      ? parsedRunNumber
      : 1;

  // 確認対象を選択
  const targetIndex = (runNumber - 1) % urls.length;
  const url = urls[targetIndex];

  console.log(
    `実行番号: ${runNumber} / ` +
    `確認対象: ${targetIndex + 1}/${urls.length}`
  );

  let browser;

  try {
    // ブラウザ起動
    browser = await chromium.launch({
      headless: true
    });

    // 監視専用のブラウザ環境
    const context = await browser.newContext({
      userAgent: 'SyntheticMonitor/1.0',
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo'
    });

    const page = await context.newPage();

    // 解析・広告計測サービスへの通信を遮断
    await page.route('**/*', async (route) => {
      const requestUrl = route.request().url();

      if (isTrackingRequest(requestUrl)) {
        console.log(
          `計測リクエストを遮断: ${requestUrl}`
        );
        await route.abort('blockedbyclient');
        return;
      }

      await route.continue();
    });

    // JavaScript実行時エラーを記録
    const pageErrors = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // ページ読み込み
    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout: TIMEOUT_MS
    });

    if (!response) {
      throw new Error(
        'HTTPレスポンスを取得できませんでした。'
      );
    }

    // ページ表示を少し待つ
    await page.waitForTimeout(RENDER_WAIT_MS);

    // ページ状態を確認
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      readyState: document.readyState,
      hasBody: Boolean(document.body)
    }));

    const status = response.status();

    console.log('------------------------------');
    console.log(`確認日時: ${new Date().toISOString()}`);
    console.log(`URL: ${url}`);
    console.log(`HTTPステータス: ${status}`);
    console.log(`ページタイトル: ${pageInfo.title}`);
    console.log(`読み込み状態: ${pageInfo.readyState}`);
    console.log(`本文要素: ${pageInfo.hasBody}`);
    console.log('------------------------------');

    // HTTPエラーを確認
    if (status >= 400) {
      console.error(`HTTPエラー: ${status}`);
      process.exitCode = 1;
    }

    // ページ表示を確認
    if (!pageInfo.hasBody) {
      console.error('ページ本文が見つかりません。');
      process.exitCode = 1;
    }

    // JavaScriptエラーは記録するが、ページの応答確認とは分離して警告扱いにする
    if (pageErrors.length > 0) {
      console.warn('JavaScript実行エラー（警告のみ）:');

      for (const error of pageErrors) {
        console.warn(`- ${error}`);
      }
    }

  } catch (error) {
    console.error(`確認に失敗しました: ${error.message}`);
    process.exitCode = 1;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
})().catch((error) => {
  console.error(`予期しないエラー: ${error.message}`);
  process.exitCode = 1;
});
