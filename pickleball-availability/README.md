# pickleball-availability

東京周辺ピックルボールコートの空き状況を**閲覧のみ**で一覧化する個人用CLI。予約・決済・ログイン・個人情報入力は行わない。

## 使い方
```
node bin/cli.js [--facility ID ...] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--format table|json|both] [--no-cache]
```
- 範囲は最大14日。施設ごとに `min_interval_ms`(既定3秒)あけて直列に取得、結果は15分キャッシュ(`.cache/`)。
- 出力には必ず取得時刻 `fetched_at` を含む。取得できなかったものは `unknown`(推測で埋めない)。

## 共通スキーマ (`src/schema.js`)
`{ facility, court_type(indoor|outdoor|unknown), date, start, end, status(available|booked|unknown), price, booking_url, fetched_at, note? }`
時刻 `HH:MM`・日付 `YYYY-MM-DD`(JST)、`price` は円または null。

## 新施設の足し方
1. `config/facilities.json` に施設を追加(id, name, URL, court_types, price_hint, min_interval_ms)。
2. `src/adapters/<id>.js` を作り、`export const id` と `export async function fetchAvailability({facility, from, to, now, sleep})` を実装。`makeSlot()` の配列を返す。
3. 以上。レジストリは `adapters/` を自動走査する。例外を投げても runner が `unknown` として記録し、他施設は継続する。
- 取得方式は **API(JSON)優先、無ければ Playwright**(optionalDependency)。規約を先に確認すること。

## 現状
- **sansan-ikebukuro は未実装スタブ**(常に `unknown`)。実行環境からサイトに接続できず、API調査と規約確認が未完了のため。
- 共通スキーマ・設定分離・失敗隔離・キャッシュ・CLI・テスト(`npm test`)は完成。

## 保守で壊れやすい点(実装後に追記)
予約サイトのAPI/DOM変更、CAPTCHA・ログイン導入(検出したら停止する方針)、規約改定。
