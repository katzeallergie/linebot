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
- **sansan-ikebukuro は実装済み**(Playwright で `/booking` を1回開き、日付をクリックして時間別の空きコート数を読む)。ログイン・予約・決済はせず、時間枠も選ばない。
- 規約(https://sansan-pickleball.com/terms/ 第4条)は「スクレイピングその他、予約サイトに過度の負荷を与える行為」を禁止している。依頼者の了承のうえ、閲覧のみ・低頻度(日付クリックごと3秒間隔、15分キャッシュ)で運用する。robots.txt は存在しない。
- 公開 JSON API(`/api/bookings/availability` 等)はあるが「埋まっている枠」しか返さず、空きを自前計算するとサイト表示とずれる恐れがあるため採用しなかった。
- 共通スキーマ・設定分離・失敗隔離・キャッシュ・CLI・テスト(`npm test`)あり。

### 実行方法(Sansan)
`npm i playwright` のうえ `node bin/cli.js --from 2026-10-07 --to 2026-10-17`。ブラウザのパスは環境変数 `PB_CHROMIUM_PATH` で指定できる。11日分で約90秒。

## うまくいかなかった点・既知の制限
- **court_type は unknown、price は null**。時間枠を選ぶと待ち行列・料金のGETが数件ずつ増えるため選ばない。空きコート数は `note`(例: 空きコート2面)に入る。
- **取得するのは毎時00分開始の枠のみ**。サイトのカレンダー表示(空N枠)と突き合わせると、2026-10-07〜17の11日中7日は一致したが、4日(10/10, 10/11, 10/15, 10/17)で当ツールの合計のほうが少なかった。予約に :30 開始(例: 13:30)があるため、:30 開始の空きを拾えていない可能性がある(未検証)。**「空きなし」と出ても :30 開始の空きがあり得る**。
- 開始時刻を過ぎた枠は `unknown`(note: 終了)。

## 保守で壊れやすい点
予約サイトのAPI/DOM変更、CAPTCHA・ログイン導入(検出したら停止する方針)、規約改定。
- Sansan: CSSクラス名はハッシュ付き(`calendarDayBtn`, `hourBtn` の部分一致で読んでいる)。画面構造の変更で取れなくなったら `no time buttons found` などの unknown になる。
