# data/imported/

牌譜から /yomi 形式へ変換した中間データ・取り込みバッチの置き場。

- 採用（S/A）された問題は `../yomi-questions.json` へマージされる。
- 保留（B）の問題はここに残す。
- 検証は `node ../../scripts/validate-yomi.mjs data/imported/<file>.json`。

詳細ルール: `../../docs/yomi-ingestion.md`
