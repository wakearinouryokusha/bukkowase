'use strict';

const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = 10000;

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

// URLが正しい形式か確認する
function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

(async () => {
  const urls = readTargetUrls();

  // URLが登録されていない場合
  if (urls.length === 0) {
    console.error('config/url.txt にURLが登録されていません。');
    process.exitCode = 1;
    return;
  }

  // URLの形式を確認
  const invalidUrl = urls.find((url) => !isValidUrl(url));

  if (invalidUrl) {
    console.error(`不正なURLです: ${invalidUrl}`);
    process.exitCode = 1;
    return;
  }

  // GitHub Actionsの実行番号を取得
  const parsedRunNumber = Number.parseInt(
    process.env.GITHUB_RUN_NUMBER || '1',
    10
  );

  const runNumber = Number.isFinite(parsedRunNumber)
    ? Math.max(1, parsedRunNumber)
    : 1;

  // 実行番号に応じて確認対象を選ぶ
  const targetIndex = (runNumber - 1) % urls.length;
  const url = urls[targetIndex];

  console.log(
    `実行番号: ${runNumber} / 確認対象: ${targetIndex + 1}/${urls.length}`
  );

  // サイトのHTTP応答を確認
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal
    });

    const status = response.status;

    console.log(
      `${new Date().toISOString()} ${url} -> HTTP ${status}`
    );

    await response.body?.cancel();

    if (!response.ok) {
      console.error(`サイトの応答が正常ではありません: HTTP ${status}`);
      process.exitCode = 1;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`タイムアウトしました: ${url}`);
    } else {
      console.error(`確認に失敗しました: ${url}: ${error.message}`);
    }

    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
})().catch((error) => {
  console.error(`予期しないエラー: ${error.message}`);
  process.exitCode = 1;
});
