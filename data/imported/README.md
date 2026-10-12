# data/imported/

牌譜から /yomi 形式へ変換した中間データ・取り込みバッチの置き場。

- 採用（S/A）された問題は `../yomi-questions.json` へマージされる。
- 保留（B）の問題はここに残す。
- 検証は `node ../../scripts/validate-yomi.mjs data/imported/<file>.json`。

詳細ルール: `../../docs/yomi-ingestion.md`

## 書籍由来の未組み込み問題

書籍ページの撮影写真（gitignore の `inputdata/` `converted/` `screenshot/`）から作った問題のうち、
**まだ `../questions.json` に入っていない 29 問**の内容は `../../docs/book-source-index.md` に記録してある。
牌姿は未転記のため、実装には元写真が必要。
