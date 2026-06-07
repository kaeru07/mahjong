# /yomi 当たり牌読み 問題取り込みルール

実戦牌譜・追加問題データを **ユーザー確認で止めずに** `/yomi` 問題集へ取り込むための運用仕様。
会社側の運用ルール正本は `/root/company/CLAUDE.local.md` §「麻雀 /yomi 取り込みルール」。本ファイルはアプリ側の実装仕様。

## 目的・基本方針

- 追加問題データの取り込みは**承認待ちで止めない**（危険操作を除き自走）。
- 妥当な仮説で変換・正規化・検証まで進める。
- 問題があるデータは**破棄でなく quarantine / rejected として隔離**する（隔離も問題データのみ・生牌譜は持たない）。
- **問題数より問題品質を優先**。**上級者帯牌譜（魂天・王座・鳳凰卓）由来の良問を優先的に蓄積**。
- 最後に取り込み結果だけ報告する。

## 生牌譜を保管しない運用（2026-06-07 改修）

利用規約（牌譜再配布禁止）対応として、**生牌譜は保管・公開しない。問題データのみ保存し、処理後に元牌譜を削除する。**

- **保持する**: 問題 / 解説 / 読み筋(readingBasis) / 危険度(dangerLevel) / カテゴリ(tags) / 出典種別(`source.sourceType` / `source.sourceRank`)
- **保持しない**: 生牌譜 / mjlog / xml / mjai 原本 / 牌譜ID(gameId) 等の牌譜本体へのポインタ
- `source.gameId` 等のポインタは検証で**エラー**になる（`scripts/lib/yomi-validate.mjs`）。
- 生牌譜・中間データ・隔離データは `.gitignore` 済み。**コミットするのは `data/yomi-questions.json` のみ**。

### パイプライン

```
牌譜取得 → 解析 → 問題候補生成 → 品質判定 → S/A採用 → yomi-questions.json保存 → 元牌譜削除
```

- 取得〜候補生成（mjlog→候補JSON）は外部ツール（`docs/tenhou-collection.md`）。
- 品質判定〜採用〜**元牌譜削除**は `scripts/ingest-yomi.mjs`（`--raw <dir>` で生牌譜を処理後削除）。

## 取り込み先

| パス | 役割 | git |
|---|---|---|
| `data/yomi-questions.json` | **採用済み正本**（S/A ランクのみ） | コミットする |
| `data/imported/`, `data/imported/pending/` | 取り込み中間データ・B保留（問題データのみ） | gitignore（ローカルのみ） |
| `data/rejected/` | C=隔離 / D=破棄理由付き（問題データのみ・生牌譜なし） | gitignore（ローカルのみ） |
| 生牌譜の作業ディレクトリ（任意・`--raw`） | mjlog/xml 等の一時置き場 | gitignore＋**処理後に削除** |

- **元牌譜ファイル（生データ）は問題生成後に削除する**。ただし削除は ingest 成功後のみ。
- 既存の良問データを大量削除しない。rejected/ は破棄の代わりの隔離先で理由を必ず添える。

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
| **B** | 保留 | `data/imported/pending/`（ローカルのみ） |
| **C** | 隔離 | `data/rejected/`（quarantine・ローカルのみ） |
| **D** | 破棄 | `data/rejected/`（破棄理由を添える。問題データのみ・生牌譜は持たない） |

### 品質採点（B→A 自動判定）

`scripts/lib/yomi-score.mjs`（CLI: `scripts/yomi-quality-score.mjs`）が、和了者の河と盤面から読み要素を検出して加点し S/A/B/C を判定する。`tenhou-to-yomi.mjs` は変換時にこの採点を適用する。

| 読み要素 | 配点 | 検出 |
|---|---|---|
| スジ引っ掛け | +3 | 当たり牌が和了者の河のスジ（=安全に見える）なのに当たり |
| 無スジ | +2 | 中張(2-8)で和了者の河にスジが無い |
| 字牌処理 | +2 | 当たり牌が字牌（単騎/シャンポン） |
| 対子落とし | +2 | 和了者が同一牌を連続手出し |
| リャンメン落とし | +2 | 和了者が同色隣接を連続手出し |
| 染め手気配 | +2 | 当たり色を河にほぼ切らず他色多数（or 副露） |
| 壁 | +1 | 場に4枚見えの数牌がある |
| ワンチャンス | +1 | 場に3枚見えの数牌がある |
| 現物 | +1 | 選択肢に和了者の現物を含む |
| リーチ宣言牌 | +1 | 和了者がリーチ |

- 判定: コア読み要素（現物/リーチ以外）が無ければ **C**。それ以外で `score>=7→S / >=5→A / >=3→B / else C`。
- **採用は S/A のみ**。判定結果は `readingBasis` と `explanation`（「なぜA: 無スジ+2, …」）に反映。
- レポート: `node scripts/yomi-quality-score.mjs <候補> ` で 候補数 / S・A・B・C 数 / A判定サンプル / 不採用理由上位 を出力。
- 注意（v1）: 配点・閾値は要調整。`無スジ` と `染め手気配` は「当たり色を河に切っていない」点で重複加点しうる。自動 S/A は人手レビューで最終確認することを推奨。

## 出典タグ（sourceType / sourceRank）

採用する問題には出典の「種別」を付ける（牌譜本体・gameId は持たない）。

```jsonc
"question": {
  // ...
  "qualityRank": "S",
  "source": { "sourceType": "tenhou", "sourceRank": "houou", "importedAt": "2026-06-07T..." }
}
```

- `sourceType`: `tenhou` / `majsoul` など。
- `sourceRank`: `houou`(鳳凰卓) / `tokujou`(特上卓) / `konten`(魂天) / `ouza`(王座の間) / `tama`(魂の間) など。
- 集計: `node scripts/yomi-stats.mjs` で鳳凰卓問題数 / 魂天問題数 / 王座問題数 等を出力。

## 標準フロー

1. 牌譜取得（houou-logs 等）→ 解析 → 問題候補 JSON 生成（`data/imported/` 等のローカル一時領域。`docs/tenhou-collection.md`）。候補に `qualityRank` と `source`(sourceType/sourceRank) を付与。
2. `node scripts/ingest-yomi.mjs <候補file|dir> --raw <生牌譜dir> --raw-count <n>`
   - 整合検証 → 品質判定（S/A採用・B保留・C/D隔離）→ 重複除外 → `yomi-questions.json` へマージ → 採用後の正本を再検証 → **元牌譜(`--raw`)を削除** → 結果集計を表示。
   - 確認だけなら `--dry-run`（書き込み・削除なし）。
3. `node scripts/validate-yomi.mjs`（正本）→ `node scripts/yomi-stats.mjs`（集計）→ `npx tsc --noEmit` → `npx next build`。
4. Obsidian `20_reviews/` 記録 + `_review_queue.md` 追記 + `ob sync`。
5. 通常 commit / push（コミットされるのは `data/yomi-questions.json` のみ＝生牌譜・中間/隔離データは gitignore）。

## 完了報告フォーマット

- 読み込んだ牌譜数 / 生成した問題数
- 採用数 / 保留数 / 隔離数 / 破棄数
- 代表的な破棄理由
- 品質ランク内訳（S/A/B/C/D）
- 出典別内訳（鳳凰卓 / 魂天 / 王座 …）
- 変更ファイル
- tsc / build 結果
- commit / push 結果
- 次に改善すべき点

## rejected/ ファイル形式（隔離レコード・ローカルのみ）

`scripts/ingest-yomi.mjs` が `data/rejected/ingest-<timestamp>.json` に出力する。生牌譜は含めない（問題候補と理由のみ）。

```json
[
  {
    "rank": "C",
    "reason": "整合エラー: 河がバラバラで読み筋を説明できない",
    "question": { /* 問題候補オブジェクト（生牌譜は含めない） */ }
  }
]
```
