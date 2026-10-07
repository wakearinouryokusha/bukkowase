Site Visitor - Playwright版(30分ごと)

登録したWebサイトを、GitHub Actions上の実際のChromiumブラウザ(Playwright)で 30分ごとに1回 開く構成です。 JavaScriptも実行され、ページ読み込み後に5秒間滞在します。

使い方
このリポジトリの Actions タブを開きます。
Set target URL → Run workflow を開き、url に対象サイトを入力して実行します。 URLが config/url.txt に保存され、すぐに1回アクセスします。
その後、Website visit every 30 min (Playwright) が毎時17分と47分に自動実行されます。
すぐ試すなら、Website visit every 30 min (Playwright) → Run workflow で手動実行できます。

URLを変更するときも Set target URL を再実行してください。

確認方法

Actions タブで実行を開き、Visit site のログに 日時 URL -> HTTPステータス "ページタイトル" が出ていれば成功です。 HTTPステータスが400以上、または読み込みに失敗した場合は、その実行が失敗(赤)になります。

無料について

Publicリポジトリで標準のGitHub-hostedランナーを使う場合は、無料で使えます。 Privateリポジトリは月間の無料枠を消費します(30分ごと=月約1,440回。1回あたり1〜2分かかります)。最新の料金は公式ページで確認してください。

注意
GitHubのcronは混雑時に遅れることがあり、厳密な30分間隔にはなりません。
Publicリポジトリでは、60日間リポジトリの動きがないとスケジュール実行が自動停止します。止まったらActionsタブから再開するか、Set target URL を実行してください。
config/url.txt のURLはPublicリポジトリでは他人にも見えます。APIキーなどの秘密情報をURLに含めないでください。
ログイン状態やCookieは毎回リセットされます。CAPTCHAやアクセス制限の突破には対応していません。
対象サイトの利用規約・アクセス制限・robots.txt等に従って利用してください。
