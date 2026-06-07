# 天鳳 公開牌譜 収集の調査（/yomi 高品質牌譜の収集）

`/yomi` 問題生成用に、天鳳の公開牌譜を **認証不要・Cookie不要** で `data/imported/` に集める方法の調査結果。
取り込み後の処理は `docs/yomi-ingestion.md` を参照。

調査日: 2026-06-07

---

## ⚠ 最重要：利用規約リスク（先に読むこと）

天鳳の公開ページおよび収集ツール（houou-logs）の双方が、牌譜について以下を**明確に禁止**している:

- **牌譜の再配布禁止**（publish / share / mirror / redistribute）
- 競合サービスへの利用、不特定多数がダウンロードできるサービス化、**天鳳の対戦と無関係な麻雀サービスへの適用**の禁止
- 公式文言: 「天鳳の牌譜は、天鳳での対戦を公正に楽しんでいただく目的で公開されています。」

**本プロジェクトへの影響**:
- 生牌譜を **GitHub（`kaeru07/mahjong`）に push すると「再配布」に該当**しうる。
- `/yomi`（天鳳と無関係な麻雀学習サービス）への適用も規約のグレー〜抵触ゾーン。

**取った対策（このリポジトリ側）**:
- `.gitignore` に生牌譜（`*.mjlog` / `data/imported/**/*.xml|json` / `raw/` / `tenhou/`）を追加し、**生データを誤って commit / push しない**ようにした。
- `data/imported/` には変換途中バッチを置くが、**生牌譜そのものは git 管理外**。

**残る判断（ユーザー承認事項）**:
- 牌譜から生成した `/yomi` 問題（変換物）を公開リポジトリに置く可否は、規約解釈・法的リスクを伴う**人間の判断**。問題文を十分に抽象化／再構成しても「天鳳牌譜由来」である事実は残る。
- ローカルでのみ問題生成し公開しない運用なら安全側。公開前提なら別ソース（規約が許す牌譜・自作対局・許諾済みデータ）の検討を推奨。

→ この点は **承認必須（セキュリティ/法務リスク）** として扱い、自走しない。

---

## 1. おすすめ収集方法

**結論: 天鳳の公開フル牌譜は実質「鳳凰卓(scc)」のみ。`Apricot-S/houou-logs` で鳳凰卓を収集するのが最善。**

### 公開アーカイブの構造（`https://tenhou.net/sc/raw/`・認証不要）

| プレフィックス | 種別 | フル牌譜の公開 |
|---|---|---|
| sca | 個室 | ✗（参加者本人のみ） |
| scb | 段位戦（一般/上級/**特上**） | ✗（本人のみ・公開アーカイブに replay ref 無し） |
| **scc** | **鳳凰卓** | **✓ 公開・replay ref あり** |
| scd | 雀荘戦 | ✗ |
| sce | 技能戦/琥珀卓 | ✗ |

- 年次 zip: `scrawYYYY.zip`（2006〜2025、10M〜607M）。直近は `list.cgi`（約5分毎更新）。
- **特上卓上位の公開フル牌譜は基本的に入手不可**（本人のダウンロードのみ）。
  - → ユーザー要望「特上卓上位優先」は公開ソースでは満たせない。ただし **鳳凰卓は特上の上位帯（七段+/特上点到達者）= より高品質**なので、鳳凰卓に集約すれば「高品質牌譜」の目的は満たせる。
  - 鳳凰卓の中でさらに絞るなら、scc 各行のプレイヤー段位（十段/天鳳位など）でフィルタ可能。

### 推奨フロー

1. `houou-logs fetch <db>` … scc から鳳凰卓の log ID を SQLite に収集（年次 zip 一括 or 直近 list.cgi）。
2. `houou-logs download <db> --players 4 --length h` … mjlog 本体を取得（4人/半荘などで絞る）。
3. `houou-logs export <db> data/imported/tenhou/` … `.xml`（mjlog）として書き出し。
4. mjlog → JSON / mjai へ変換（下記ツール）→ `/yomi` 形式へ変換 → `scripts/validate-yomi.mjs` 検証 → S/A のみ採用。

---

## 2. 必要ツール

| 用途 | ツール | 言語/ライセンス | 備考 |
|---|---|---|---|
| 鳳凰卓 収集（推奨） | [Apricot-S/houou-logs](https://github.com/Apricot-S/houou-logs) | Python / MIT | phoenix-logs の後継。fetch/download/export、レート制御内蔵 |
| 収集（旧・参考） | [MahjongRepository/phoenix-logs](https://github.com/MahjongRepository/phoenix-logs) | Python / MIT | **archived**。並列3→1に要変更 |
| 個別ID取得・閲覧 | [mthrok/tenhou-log-utils](https://github.com/mthrok/tenhou-log-utils) | Python / MIT | ID指定でDL・コンソール表示 |
| mjlog → tenhou JSON | [tsubakisakura/mjlog2json](https://github.com/tsubakisakura/mjlog2json) | — | XML→JSON |
| Tenhou → mjai | [NikkeTryHard/tenhou-to-mjai](https://github.com/NikkeTryHard/tenhou-to-mjai) | — | Mortal等のmjai形式 |
| mjlog パース（ライブラリ） | [MahjongRepository/mahjong](https://github.com/MahjongRepository/mahjong) | Python / MIT | 局・打牌・鳴き等を構造化 |

環境: Python 3 + pip/uv。`/yomi` 変換アダプタ（mjai/JSON → yomi-questions 形式）は自作（既存 `scripts/validate-yomi.mjs` で検証）。

---

## 3. 実装難易度

**全体: 低〜中。**

- 収集（houou-logs）: **低**。pip/uv で導入、3コマンドで mjlog 取得まで完了。レート制御も内蔵。
- mjlog → JSON/mjai 変換: **低**。既存 OSS をそのまま利用。
- **mjai/JSON → /yomi 問題への変換アダプタ: 中**（ここが本作業）。
  - 局からロン/ツモ局面を抽出 → 10巡目以降 → 当たり牌を hiddenTile に → 4選択肢（現物/スジ等）を自動生成 → dangerLevel/readingBasis を初期付与 → 品質ランク判定。
  - 「読み筋を説明できるか」「正解が一意か」の判定が難所（除外条件に該当）。
- 既存の取り込みパイプライン（`docs/yomi-ingestion.md` + `validate-yomi.mjs` + imported/rejected）に乗るので土台は整備済み。

---

## 4. 継続収集できるか

**できる。**
- `list.cgi` が約5分毎に更新 → 直近の鳳凰卓 log ID を**増分取得**可能。
- 年次 zip（`scrawYYYY.zip`）で過去分を**バックフィル**可能。
- houou-logs は SQLite に取得済み ID を保持するため、再実行で**差分のみ**追加（重複回避）。

---

## 5. 自動化可能か

**技術的には可能（cron 化）。ただし規約・運用上の制約あり。**

- **技術面**: fetch→download→変換→validate→（採用）を cron で回せる。
  - **必須マナー**: 同時1セッション・**20分以上の間隔**・圧縮ファイル優先（houou-logs が遵守）。負荷をかけない。
- **運用面（重要）**:
  - **生牌譜の自動 push は禁止**（再配布に該当）。.gitignore で防御済み。
  - 自動化するなら「ローカルで収集＋問題生成」までに留め、**公開反映は人間判断**を挟む（前述の承認必須事項）。
- 推奨: 「収集＋変換＋ローカル検証」までを半自動、「公開（push）」は手動承認のゲートを置くハイブリッド。

---

## まとめ（要点）

- 公開フル牌譜は **鳳凰卓(scc)のみ**。特上卓上位は公開入手不可だが、鳳凰卓＝最上位公開帯なので品質目的は達成。
- ツールは **Apricot-S/houou-logs**（収集）＋ mjlog2json / tenhou-to-mjai（変換）が鉄板。認証/Cookie 不要。
- 難易度は低〜中、継続・自動化も可能。
- **最大の論点は技術ではなく利用規約（再配布禁止）**。生牌譜は git 管理外にし、公開可否は人間が判断する。

## 参考リンク

- 天鳳 公開ログ: https://tenhou.net/sc/raw/ ／ ビューア https://tenhou.net/mjlog.html
- Apricot-S/houou-logs: https://github.com/Apricot-S/houou-logs
- 牌譜DLツール一覧（Qiita, Apricot-S）: https://qiita.com/Apricot-S/items/19864b3395cce566c719
- mjlog2json: https://github.com/tsubakisakura/mjlog2json
- tenhou-to-mjai: https://github.com/NikkeTryHard/tenhou-to-mjai
- MahjongRepository/mahjong: https://github.com/MahjongRepository/mahjong
