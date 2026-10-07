# 引き継ぎ: ピックルボール空き状況ツール (Sansan池袋)

## 依頼の要旨
Sansanピックルボールコート池袋(予約: https://reserve.sansan-pickleball.com/booking 、公式: https://sansan-pickleball.com/ 、規約: https://sansan-pickleball.com/terms/)の空き状況を**閲覧のみ**で取得するCLI。将来は他施設(ピックルボールワン銀座新橋、pickle9等)を「アダプタ追加だけ」で対応。個人利用。
取得項目: date / start / end / court_type(indoor|outdoor) / status(available|booked|unknown) / price / booking_url / fetched_at

## 守ること(依頼者の指定)
- 読み取り専用。予約確定・決済・ログイン・個人情報入力は一切しない。
- CAPTCHA/ログイン要求が出たら回避せず停止して報告。
- アクセスは控えめ(間隔をあける、同日連打しない、キャッシュ)。
- 推測で埋めない。取得不可は unknown。出力に取得時刻を含める。
- **規約で自動取得が禁止されていそうなら、実装を止めて依頼者に確認。**
- 進め方: ①通信観察でAPI(JSON)の有無を調べる→②APIがあれば優先、無ければPlaywrightで画面読み取り→③方式と理由を説明→④規約確認。**実装前に調査結果(API有無・規約結果)を報告すること。**

## 現状
- 完成: 共通スキーマ(src/schema.js)、設定分離(config/facilities.json)、アダプタ自動登録(src/adapters/index.js)、失敗隔離+間隔+15分キャッシュ(src/runner.js, cache.js)、CLI(bin/cli.js)、表出力(format.js)、テスト3件(npm test 通過)、README。
- **未実装: src/adapters/sansan-ikebukuro.js はスタブ(常にunknown)。**
- **未実施: 規約確認、robots.txt確認、API調査。** 前セッションの環境は対象2ドメインへの接続がプロキシで遮断(curl 403 / WebFetch EGRESS_BLOCKED)。回避はしていない。

## 次にやること
1. 対象ドメインに接続できるセッション/環境にする(許可ドメイン: sansan-pickleball.com, reserve.sansan-pickleball.com)。もしくは規約全文・Network(Fetch/XHR)ログを依頼者から受け取る。
2. 規約と robots.txt を確認し、自動取得に関する記述を原文で報告。禁止なら停止して確認。
3. Playwrightで /booking を開き、空き状況を返すJSON APIの有無を確認(ログイン不要の範囲のみ)。
4. 方式を決めて報告(理由つき)→ アダプタ実装(makeSlot()の配列を返す)。
5. READMEに「うまくいかなかった点」「壊れやすい箇所」を追記。

## 補足
- Node 22、ESM、依存なし(playwrightはoptionalDependency)。`node --test "test/*.test.js"`(Node22はディレクトリ指定不可)。
- 作業は linebot リポジトリと無関係。未コミット・未push。ファイルは前セッションのコンテナ内のみに存在するため、消える前に回収すること。

## 更新 (2026-10-07)
- 依頼者から「閲覧のみ・低頻度で進めてよい」と了承を得て、sansan-ikebukuro を実装済み(詳細は README)。
- 条件検索 bin/query.js を追加(日付・開始・何時間・地域・安い順)。10/13, 10/17 で実サイトと一致を確認。
- :30 開始の取りこぼし説は否定(README参照)。カレンダー「空N枠」との差は原因未確認。
- 次: 他施設(ピックルボールワン銀座新橋、pickle9 等)は、施設ごとに規約確認 → API/画面調査 → アダプタ(fetchAvailability + findCourts)。依頼者へ報告してから実装すること。
