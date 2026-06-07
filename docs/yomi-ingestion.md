# /yomi 当たり牌読み 問題取り込みルール

実戦牌譜・追加問題データを **ユーザー確認で止めずに** `/yomi` 問題集へ取り込むための運用仕様。
会社側の運用ルール正本は `/root/company/CLAUDE.local.md` §「麻雀 /yomi 取り込みルール」。本ファイルはアプリ側の実装仕様。

## 目的・基本方針

- 追加問題データの取り込みは**承認待ちで止めない**（危険操作を除き自走）。
- 妥当な仮説で変換・正規化・検証まで進める。
- 問題があるデータは**削除ではなく quarantine / rejected として隔離**する。
- **問題数より問題品質を優先**。**上級者帯牌譜（魂天・王座・鳳凰卓）由来の良問を優先的に蓄積**。
- 最後に取り込み結果だけ報告する。

## 取り込み先

| パス | 役割 |
|---|---|
| `data/yomi-questions.json` | **採用済み正本**（S/A ランクのみ） |
| `data/imported/` | 取り込み中間データ・バッチ（任意・元牌譜変換物） |
| `data/rejected/` | 不正・低品質データの隔離（C=quarantine / D=破棄理由付き） |

- **元牌譜ファイルは削除しない。** 既存の良問データを大量削除しない。
- rejected/ は削除の代わりの隔離先。理由を必ず添える。

## 自走してよいこと（承認不要）

牌譜JSON読み込み / `yomi-questions.json` 形式への変換 / 当たり牌伏せ問題の自動生成 / 牌表記ゆれの正規化 / 4人分の河の補完チェック / 10巡目以降の局面抽出 / ロン・ツモ場面の抽出 / choices 自動生成 / correctTile・hiddenTile・waits 整合チェック / dangerLevel・readingBasis 初期付与 / 重複問題の除外 / 低品質問題の rejected 隔離 / build・tsc・データ検証 / Obsidian・review_queue 記録 / 通常 commit・push。

## やってはいけないこと（承認必須 or 禁止）

元牌譜ファイルの削除 / 既存良問データの大量削除 / DBスキーマ破壊変更 / 課金API利用 / 外部サービスへの牌譜送信 / 認証情報・Cookie の保存 / force push / 本番データ削除。

## 取り込み条件（すべて満たすこと）

1. 4人分の河がある
2. ロン/ツモの結果がある
3. 当たり牌が特定できる
4. 当たり牌だけを `hiddenTile` として伏せられる
5. **10巡目以降を優先**
6. 読み根拠を1つ以上付与できる（`readingBasis` か `dangerReason`）
7. `choices` に `correctTile` が含まれる
8. `correctTile` と `result.hiddenTile` が一致
9. `waits` に `correctTile` が含まれる
10. 既存UIで表示できる（`types/yomi.ts` のスキーマに適合）

→ これらは `scripts/validate-yomi.mjs` で機械的に検証する。

## 牌譜ソース優先度（上級者牌譜優先）

| 帯 | rankTier | ソース |
|---|---|---|
| 最優先 | `top` | 雀魂 魂天 / 雀魂 王座の間 / 雀魂 魂の間 / 天鳳 鳳凰卓 |
| 優先 | `preferred` | 天鳳 特上卓上位 / 玉の間 高段位 |
| 条件付き | `conditional` | 玉の間 / 特上卓 |
| 原則除外 | `excluded` | 金の間 / 銀の間 / 銅の間 / 初心者卓 |

採用は `top` / `preferred` を優先。`conditional` は問題化条件を満たす良問のみ。`excluded` は原則除外。

## 問題化条件（いずれかを満たす）

河読みで待ちが推測できる / 手出し・ツモ切りに意味がある / 対子落としが読める / リャンメン落としが読める / 染め手気配がある / 字牌処理が参考になる / スジが機能する / 壁が機能する / ワンチャンスが機能する / 打点読み要素がある / 終盤判断が学べる。

## 除外条件（いずれかに該当で不採用）

明らかな初心者卓 / 河がバラバラで読みにならない / 待ちが偶然当たっただけ / 学習価値が低い / 牌効率ミスが多すぎる / 読み筋を説明できない / 問題として正解が一意にならない。

## 品質ランクと処理

| ランク | 意味 | 処理 |
|---|---|---|
| **S** | 教材価値が非常に高い・複数の読み要素・実戦頻出 | 採用（`yomi-questions.json`） |
| **A** | 十分採用価値あり | 採用（`yomi-questions.json`） |
| **B** | 保留 | `data/imported/` に保留 |
| **C** | 隔離 | `data/rejected/`（quarantine） |
| **D** | 破棄 | `data/rejected/`（破棄理由を添える。ファイルは消さない） |

## 標準フロー

1. 牌譜JSONを読み込む（`data/imported/` 等）。
2. `yomi-questions.json` 形式へ変換・牌表記正規化・10巡目以降のロン/ツモ局面抽出。
3. choices 自動生成（correctTile＋現物/スジ等の妥当な distractor 4個以上）。
4. dangerLevel・readingBasis を初期付与（問題化条件のどれが効くか）。
5. `node scripts/validate-yomi.mjs <候補file>` で整合検証。
6. 品質ランク判定（S/A=採用、B=保留、C/D=rejected へ理由付きで隔離）。
7. 重複除外して `yomi-questions.json` へマージ。
8. `node scripts/validate-yomi.mjs`（正本）→ `npx tsc --noEmit` → `npx next build`。
9. Obsidian `20_reviews/` 記録 + `_review_queue.md` 追記 + `ob sync`。
10. 通常 commit / push。

## 完了報告フォーマット

- 読み込んだ牌譜数 / 生成した問題数
- 採用数 / 保留数 / 隔離数 / 破棄数
- 代表的な破棄理由
- 品質ランク内訳（S/A/B/C/D）
- 変更ファイル
- tsc / build 結果
- commit / push 結果
- 次に改善すべき点

## rejected/ ファイル形式（隔離レコード）

```json
[
  {
    "rank": "C",
    "reason": "河がバラバラで読み筋を説明できない",
    "source": { "platform": "雀魂", "room": "金の間", "gameId": "..." },
    "rawCandidate": { /* 変換途中の問題オブジェクト or 元牌譜抜粋 */ }
  }
]
```
