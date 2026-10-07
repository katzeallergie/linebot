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

## 条件検索 (`bin/query.js`)
「来週土曜16:00から2時間空いてる安いコートは?」のような質問向け。日本語→条件の変換は Claude が行い、ツールは決まった処理だけを行う。
```
node bin/query.js --date 2026-10-17 --start 16:00 --duration 2 [--region tokyo] [--court-type indoor|outdoor] [--max-price 合計円] [--sort price|name] [--format table|json]
```
- 同じコートが `start` から `duration` 時間ぶん連続で空いているものを、合計料金の安い順に返す。
- 方式: 開始時刻を選び「＋」で利用時間を延ばし、コート別の空き・単価を読む(予約には進まない)。1回の検索で施設ごとに数件のGETが発生する。
- 失敗した施設は `errors`、検索未対応(adapter に `findCourts` が無い)施設は `skipped` に出し、推測しない。
- 施設の絞り込みは `config/facilities.json` の `region`(例: tokyo)で行う。

## 新施設の足し方
1. `config/facilities.json` に施設を追加(id, name, URL, court_types, price_hint, min_interval_ms)。
2. `src/adapters/<id>.js` を作り、`export const id` と `export async function fetchAvailability({facility, from, to, now, sleep})` を実装。`makeSlot()` の配列を返す。条件検索に対応するなら `findCourts({facility, date, start, duration})` も実装し、`[{court, floor, court_type, price_per_hour, total_price}]` を返す(`src/courts.js` は Sansan 用の画面テキスト解析)。
3. 以上。レジストリは `adapters/` を自動走査する。例外を投げても runner が `unknown` として記録し、他施設は継続する。
- 取得方式は **API(JSON)優先、無ければ Playwright**(optionalDependency)。規約を先に確認すること。

## 現状
- **sansan-ikebukuro は実装済み**(Playwright で `/booking` を1回開き、日付をクリックして時間別の空きコート数を読む)。ログイン・予約・決済はせず、時間枠も選ばない。
- 規約(https://sansan-pickleball.com/terms/ 第4条)は「スクレイピングその他、予約サイトに過度の負荷を与える行為」を禁止している。依頼者の了承のうえ、閲覧のみ・低頻度(日付クリックごと3秒間隔、15分キャッシュ)で運用する。robots.txt は存在しない。
- 公開 JSON API(`/api/bookings/availability` 等)はあるが「埋まっている枠」しか返さず、空きを自前計算するとサイト表示とずれる恐れがあるため採用しなかった。
- 共通スキーマ・設定分離・失敗隔離・キャッシュ・CLI・テスト(`npm test`)あり。

### 実行方法(Sansan)
`npm i playwright` のうえ `node bin/cli.js --from 2026-10-07 --to 2026-10-17`。ブラウザのパスは環境変数 `PB_CHROMIUM_PATH` で指定できる。11日分で約90秒。

## うまくいかなかった点・既知の制限
- **court_type は unknown、price は null**。時間枠を選ぶと待ち行列・料金のGETが数件ずつ増えるため選ばない。空きコート数は `note`(例: 空きコート2面)に入る。
- サイトの開始時間は毎時00分のみ、利用時間は1時間単位(最大3〜4時間)。時間リストと日別カレンダーの「空N枠」は一部の日で合計が一致しなかった(11日中4日)。10/10 で時間リスト・コート別表示とも当ツールの出力と一致したため、カレンダー側の数え方が違うと見ている(原因は未確認)。当ツールは時間リストとコート別表示を正とする。
- 開始時刻を過ぎた枠は `unknown`(note: 終了)。

## 保守で壊れやすい点
予約サイトのAPI/DOM変更、CAPTCHA・ログイン導入(検出したら停止する方針)、規約改定。
- Sansan: CSSクラス名はハッシュ付き(`calendarDayBtn`, `hourBtn` の部分一致で読んでいる)。画面構造の変更で取れなくなったら `no time buttons found` などの unknown になる。
