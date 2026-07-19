#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// /yomi 当たり牌読み 問題データ検証スクリプト
//
// 用途:
//   node scripts/validate-yomi.mjs [file]
//   - file 省略時は data/yomi-questions.json（採用済み正本）を検証
//   - 取り込みバッチ検証時は対象 JSON を引数で渡す
//
// 終了コード: 0 = 全件PASS / 1 = エラーあり（取り込み禁止）
//
// 取り込みルール詳細: docs/yomi-ingestion.md
// ─────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateQuestions } from "./lib/yomi-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const target = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(repoRoot, "data/yomi-questions.json");

let data;
try {
  data = JSON.parse(readFileSync(target, "utf8"));
} catch (e) {
  console.error(`❌ ${target} を読み込めません: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(data)) {
  console.error("❌ ルートは配列である必要があります");
  process.exit(1);
}

const { errors, warns } = validateQuestions(data);

console.log(`対象: ${target}`);
console.log(`問題数: ${data.length}`);
if (warns.length) console.log(`\n⚠ 警告 (${warns.length}):\n  ` + warns.join("\n  "));
if (errors.length) {
  console.log(`\n❌ エラー (${errors.length}):\n  ` + errors.join("\n  "));
  console.log("\n→ エラーがあるデータは採用せず rejected/quarantine 扱いにすること。");
  process.exit(1);
}
console.log("\n✅ 全件 PASS（採用可）");
