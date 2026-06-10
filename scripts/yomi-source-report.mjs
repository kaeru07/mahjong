#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// /yomi 原本差分レポート 生成CLI
//
// 「アプリ表示用の問題(candidates)」と「原本(originals)」を突き合わせ、
// 問題ごとに 14項目の一致/不一致/欠落 と 一致率・status(exact/partial/failed) を出力する。
// 原本との差分（例: 上家河 12枚 → 8枚 / 下家鳴き欠落 / 自風不一致）を一覧化する。
//
// 使い方:
//   node scripts/yomi-source-report.mjs <candidates.json> --original <originals.json> [options]
//     --original <file>   原本データ（id→盤面）。配列 or {id: original} オブジェクト。
//     --kind json|image   原本の種別（既定 json）
//     --json              SourceValidation を JSON で出力（パイプ用）
//     --write             candidates に sourceValidation を付与して書き戻す（--out 先）
//     --out <file>        --write の出力先（既定: 入力を上書き）
//     --reviewed-by <s>   reviewedBy を記録（例: claude / human）
//
// 原本フォーマット: { roundInfo?, players?, result?, hands? }（部分指定可）。
//   無い項目は unknown 扱いで一致率の分母から除外。
// ルール: docs/yomi-ingestion.md §「原本再現性の検証」
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { compareToOriginal, formatDiffReport } from "./lib/yomi-source-validate.mjs";

const args = process.argv.slice(2);
const opt = { original: null, kind: "json", json: false, write: false, out: null, reviewedBy: null };
const pos = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--original") opt.original = args[++i];
  else if (a === "--kind") opt.kind = args[++i];
  else if (a === "--json") opt.json = true;
  else if (a === "--write") opt.write = true;
  else if (a === "--out") opt.out = args[++i];
  else if (a === "--reviewed-by") opt.reviewedBy = args[++i];
  else pos.push(a);
}
if (pos.length === 0 || !opt.original) {
  console.error("使い方: node scripts/yomi-source-report.mjs <candidates.json> --original <originals.json> [--kind json|image] [--json] [--write [--out file]] [--reviewed-by s]");
  process.exit(2);
}

const candPath = resolve(process.cwd(), pos[0]);
const origPath = resolve(process.cwd(), opt.original);
if (!existsSync(candPath)) { console.error(`❌ 候補が存在しない: ${candPath}`); process.exit(1); }
if (!existsSync(origPath)) { console.error(`❌ 原本が存在しない: ${origPath}`); process.exit(1); }

const candsRaw = JSON.parse(readFileSync(candPath, "utf8"));
const cands = Array.isArray(candsRaw) ? candsRaw : [candsRaw];
const origRaw = JSON.parse(readFileSync(origPath, "utf8"));

// 原本を id でひけるようにする
const origById = {};
if (Array.isArray(origRaw)) for (const o of origRaw) { if (o.id) origById[o.id] = o; }
else for (const [k, v] of Object.entries(origRaw)) origById[k] = v;

let exact = 0, partial = 0, failed = 0, noOriginal = 0;
const reports = [];
for (const q of cands) {
  const orig = origById[q.id];
  if (!orig) {
    noOriginal++;
    reports.push(`—  ${q.id}  原本なし（検証スキップ）`);
    continue;
  }
  const sv = compareToOriginal(q, orig, { originalKind: opt.kind, reviewedBy: opt.reviewedBy ?? undefined });
  if (opt.write) {
    q.question = q.question || {};
    q.question.sourceValidation = sv;
  }
  if (sv.status === "exact") exact++;
  else if (sv.status === "partial") partial++;
  else failed++;
  reports.push(opt.json ? JSON.stringify({ id: q.id, sourceValidation: sv }) : formatDiffReport(q.id, sv));
}

if (opt.write) {
  const outPath = resolve(process.cwd(), opt.out ?? pos[0]);
  writeFileSync(outPath, JSON.stringify(cands, null, 2) + "\n");
  console.error(`書き戻し: sourceValidation 付与 → ${outPath}`);
}

if (opt.json) {
  process.stdout.write(reports.join("\n") + "\n");
} else {
  console.log("==== /yomi 原本差分レポート ====");
  console.log(reports.join("\n\n"));
  console.log("\n---- 集計 ----");
  console.log(`対象候補: ${cands.length} / 原本あり: ${cands.length - noOriginal} / 原本なし: ${noOriginal}`);
  console.log(`exact=${exact}  partial=${partial}  failed=${failed}`);
  console.log("注意: 原本との差分をレビューせずに S/A 採用しないこと（failed は採用不可）。");
}
