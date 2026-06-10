#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// /yomi 牌譜取り込みオーケストレータ
//
// 方針: 生牌譜を保管・公開しない。問題データのみ保存し、処理後に元牌譜を削除する。
//
// パイプライン:
//   牌譜取得 → 解析 → 問題候補生成 → 【本スクリプト】品質判定 → S/A採用
//   → yomi-questions.json 保存 → 元牌譜削除
//
// 本スクリプトは「問題候補 JSON（解析・候補生成済み）」を入力に取り、
//   品質判定(S/A採用・B保留・C隔離・D破棄) → 整合検証 → 採用分を正本へマージ
//   → 元牌譜ディレクトリ(--raw)を削除 する。
//   mjlog→候補 の変換は houou-logs + mjlog2json/tenhou-to-mjai + 変換アダプタ（外部・docs参照）。
//
// 使い方:
//   node scripts/ingest-yomi.mjs <candidates.json|dir> [options]
//     --out <path>     採用先（既定: data/yomi-questions.json）
//     --raw <dir>      処理後に削除する生牌譜ディレクトリ（生牌譜は保管しない）
//     --raw-count <n>  読み込んだ牌譜数（報告用）
//     --keep-raw       生牌譜を削除しない（既定は削除）
//     --dry-run        書き込み・削除を一切行わず判定結果のみ表示
//
// 採用は S・A のみ。問題があるデータは削除でなく rejected/quarantine に隔離。
// 取り込みルール: docs/yomi-ingestion.md
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { validateQuestion, validateQuestions, boardSignature } from "./lib/yomi-validate.mjs";
import { compareToOriginal, formatDiffReport } from "./lib/yomi-source-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// --- args ---
const args = process.argv.slice(2);
const opts = { out: resolve(repoRoot, "data/yomi-questions.json"), raw: null, rawCount: null, keepRaw: false, dryRun: false, original: null, originalKind: "json", reviewedBy: null };
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--out") opts.out = resolve(process.cwd(), args[++i]);
  else if (a === "--raw") opts.raw = resolve(process.cwd(), args[++i]);
  else if (a === "--raw-count") opts.rawCount = parseInt(args[++i], 10);
  else if (a === "--keep-raw") opts.keepRaw = true;
  else if (a === "--dry-run") opts.dryRun = true;
  else if (a === "--original") opts.original = resolve(process.cwd(), args[++i]);
  else if (a === "--original-kind") opts.originalKind = args[++i];
  else if (a === "--reviewed-by") opts.reviewedBy = args[++i];
  else positional.push(a);
}
if (positional.length === 0) {
  console.error("使い方: node scripts/ingest-yomi.mjs <candidates.json|dir> [--out ..] [--raw ..] [--raw-count n] [--keep-raw] [--dry-run]");
  process.exit(2);
}
const candidatesPath = resolve(process.cwd(), positional[0]);

// --- load candidates ---
function loadJsonArray(file) {
  const j = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(j) ? j : [j];
}
let candidates = [];
if (!existsSync(candidatesPath)) { console.error(`❌ 入力が存在しない: ${candidatesPath}`); process.exit(1); }
if (statSync(candidatesPath).isDirectory()) {
  for (const f of readdirSync(candidatesPath).filter((f) => f.endsWith(".json")).sort())
    candidates.push(...loadJsonArray(join(candidatesPath, f)));
} else {
  candidates = loadJsonArray(candidatesPath);
}

// --- load originals (任意): 原本との差分検証 ---
// 原本があれば各候補に sourceValidation を付与し、差分レポートを生成する。
// 原本差分 failed の S/A は検証(validateQuestion)でエラー化 → quarantine へ回る。
const origById = {};
if (opts.original) {
  if (!existsSync(opts.original)) { console.error(`❌ 原本が存在しない: ${opts.original}`); process.exit(1); }
  const origRaw = JSON.parse(readFileSync(opts.original, "utf8"));
  if (Array.isArray(origRaw)) for (const o of origRaw) { if (o.id) origById[o.id] = o; }
  else for (const [k, v] of Object.entries(origRaw)) origById[k] = v;
}
const diffReports = [];
const svStatusCount = { exact: 0, partial: 0, failed: 0, noOriginal: 0 };
if (opts.original) {
  for (const cand of candidates) {
    const orig = origById[cand.id];
    if (!orig) { svStatusCount.noOriginal++; continue; }
    const sv = compareToOriginal(cand, orig, { originalKind: opts.originalKind, reviewedBy: opts.reviewedBy ?? undefined });
    cand.question = cand.question || {};
    cand.question.sourceValidation = sv;
    svStatusCount[sv.status]++;
    diffReports.push(formatDiffReport(cand.id, sv));
  }
}

// --- load existing canonical ---
const existing = existsSync(opts.out) ? JSON.parse(readFileSync(opts.out, "utf8")) : [];
const seenIds = new Set(existing.map((q) => q.id));
const seenSigs = new Set(existing.map((q) => boardSignature(q)));

// --- classify ---
const adopted = [];
const pending = []; // B
const quarantined = []; // C（隔離: 不正データ含む）
const discarded = []; // D（破棄理由付き）
const rankCount = { S: 0, A: 0, B: 0, C: 0, D: 0, "(none)": 0 };
const sampleReasons = [];

for (const cand of candidates) {
  const { errors } = validateQuestion(cand, {}); // 単体整合（id重複は後段で）
  const rank = cand.question?.qualityRank;
  if (rank && rankCount[rank] !== undefined) rankCount[rank]++; else rankCount["(none)"]++;

  if (errors.length) {
    quarantined.push({ rank: "C", reason: `整合エラー: ${errors.join(" / ")}`, question: cand });
    if (sampleReasons.length < 5) sampleReasons.push(errors[0]);
    continue;
  }
  // 重複除外
  const sig = boardSignature(cand);
  if (seenIds.has(cand.id) || seenSigs.has(sig)) {
    discarded.push({ rank: "D", reason: "重複（既存と同一ID/盤面）", question: cand });
    if (sampleReasons.length < 5) sampleReasons.push(`${cand.id}: 重複`);
    continue;
  }
  // 品質判定
  if (rank === "S" || rank === "A") {
    adopted.push(cand);
    seenIds.add(cand.id);
    seenSigs.add(sig);
  } else if (rank === "C") {
    quarantined.push({ rank: "C", reason: cand.question?._rejectReason ?? "品質C（隔離）", question: cand });
  } else if (rank === "D") {
    discarded.push({ rank: "D", reason: cand.question?._rejectReason ?? "品質D（破棄）", question: cand });
    if (sampleReasons.length < 5) sampleReasons.push(`${cand.id}: ${cand.question?._rejectReason ?? "品質D"}`);
  } else {
    // B または未設定 → 保留
    pending.push(cand);
  }
}

// --- merged validation (採用後の正本が壊れないこと) ---
const merged = [...existing, ...adopted];
const mv = validateQuestions(merged);
if (mv.errors.length) {
  console.error("❌ 採用後の正本が整合エラー。書き込みを中止:\n  " + mv.errors.join("\n  "));
  process.exit(1);
}

// --- writes ---
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }
function writeJson(file, obj) { writeFileSync(file, JSON.stringify(obj, null, 2) + "\n"); }

if (!opts.dryRun) {
  if (adopted.length) writeJson(opts.out, merged);
  if (pending.length) {
    const dir = resolve(repoRoot, "data/imported/pending");
    ensureDir(dir);
    writeJson(join(dir, `ingest-${ts}.json`), pending);
  }
  const rej = [...quarantined, ...discarded];
  if (rej.length) {
    const dir = resolve(repoRoot, "data/rejected");
    ensureDir(dir);
    writeJson(join(dir, `ingest-${ts}.json`), rej);
  }
  // 原本差分レポート（ローカルのみ・gitignore）
  if (diffReports.length) {
    const dir = resolve(repoRoot, "data/source-validation");
    ensureDir(dir);
    const header = `==== /yomi 原本差分レポート ${ts} ====\nexact=${svStatusCount.exact} partial=${svStatusCount.partial} failed=${svStatusCount.failed} 原本なし=${svStatusCount.noOriginal}\n\n`;
    writeFileSync(join(dir, `diff-${ts}.txt`), header + diffReports.join("\n\n") + "\n");
  }
  // 元牌譜削除（生牌譜を保管しない）
  if (opts.raw && !opts.keepRaw) {
    if (existsSync(opts.raw)) { rmSync(opts.raw, { recursive: true, force: true }); }
  }
}

// --- report ---
const readPaifu = opts.rawCount != null ? opts.rawCount : "n/a";
console.log("==== /yomi 取り込み結果 ====");
console.log(`${opts.dryRun ? "[DRY-RUN] " : ""}入力候補: ${candidatesPath}`);
console.log(`読み込んだ牌譜数: ${readPaifu}`);
console.log(`生成した問題数(候補): ${candidates.length}`);
console.log(`採用数(S/A): ${adopted.length}`);
console.log(`保留数(B): ${pending.length}`);
console.log(`隔離数(C): ${quarantined.length}`);
console.log(`破棄数(D): ${discarded.length}`);
console.log(`品質ランク内訳: S=${rankCount.S} A=${rankCount.A} B=${rankCount.B} C=${rankCount.C} D=${rankCount.D} 未設定=${rankCount["(none)"]}`);
if (sampleReasons.length) console.log(`代表的な破棄/隔離理由:\n  - ` + sampleReasons.join("\n  - "));

// 原本差分の集計（--original 指定時）
if (opts.original) {
  console.log(`\n---- 原本再現性 ----`);
  console.log(`原本照合: exact=${svStatusCount.exact} partial=${svStatusCount.partial} failed=${svStatusCount.failed} 原本なし=${svStatusCount.noOriginal}`);
  console.log(`原本差分 failed の S/A は採用不可（隔離）。差分レポート: ${opts.dryRun ? "[DRY-RUN 省略]" : "data/source-validation/diff-" + ts + ".txt"}`);
  if (diffReports.length) console.log(diffReports.join("\n\n"));
}

// 採用後の出典別内訳
const byRank = {};
for (const q of merged) {
  const r = q.question.source?.sourceRank ?? "manual";
  byRank[r] = (byRank[r] ?? 0) + 1;
}
console.log(`正本 出典別内訳: ` + Object.entries(byRank).map(([k, v]) => `${k}=${v}`).join(" "));
console.log(`正本 総数: ${merged.length}`);
if (opts.raw) console.log(`元牌譜削除: ${opts.dryRun ? "[DRY-RUN 省略]" : opts.keepRaw ? "keep-raw 指定で保持" : existsSync(opts.raw) ? "失敗(残存)" : "削除済み"} (${opts.raw})`);
console.log(opts.dryRun ? "\n(DRY-RUN: 書き込み・削除なし)" : "\n完了");
