# Hourly Site Visitor - Playwright版

登録したWebサイトを、GitHub Actions上の実際のChromiumブラウザ（Playwright）で毎時間1回開く構成です。

## 何が違う？

前のHTTP GET版と違って、JavaScriptを実行し、ページを実際のブラウザとして読み込みます。
SPAやJavaScriptで描画されるページにも対応しやすく、ページ読み込み後に5秒間滞在します。

ただし、ログイン状態やCookieは毎回の実行で新規ブラウザになるため、永続保存はしていません。またCAPTCHAやアクセス制限を突破する用途には対応していません。

## 使い方

1. このフォルダをGitHubの新しい **Public repository** にアップロードします。
2. リポジトリの `Actions` タブを開きます。
3. `Set target URL` → `Run workflow` を開き、`url` に対象サイトを入力して実行します。
4. その後、`Hourly website visit (Playwright)` が毎時17分（Asia/Tokyo）に自動実行されます。
5. すぐ試すなら `Hourly website visit (Playwright)` → `Run workflow` で手動実行できます。

URLを変更するときも `Set target URL` を再実行してください。

## 無料について

GitHubのPublic repositoryで標準GitHub-hosted runnerを使う場合、標準ランナーは無料・無制限です。したがって、このPlaywright版もPublic repositoryなら追加料金なしで運用できます。

Private repositoryは別途GitHub Freeの月間無料枠があるため、「確実に無料で使い続ける」前提ならPublic repositoryを推奨します。

## 注意

`config/url.txt` に登録したURLはリポジトリのファイルなので、Public repositoryでは他人にも見えます。URL自体に秘密情報（APIキー等）を含めないでください。

対象サイトの利用規約・アクセス制限・robots.txt等に従って利用してください。
