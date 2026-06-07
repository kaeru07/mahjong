#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// /yomi 当たり牌読み 問題データ検証スクリプト
//
// 用途:
//   node scripts/validate-yomi.mjs [file]
//   - file 省略時は data/yomi-questions.json（採用済み正本）を検証
//   - 取り込みバッチ検証時は対象 JSON を引数で渡す
//     例: node scripts/validate-yomi.mjs data/imported/2026-06-08_batch.json
//
// 終了コード: 0 = 全件PASS / 1 = エラーあり（取り込み禁止）
//
// 取り込みルール詳細: docs/yomi-ingestion.md
// ─────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const target = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(repoRoot, "data/yomi-questions.json");

const SEATS = ["self", "shimocha", "toimen", "kamicha"];
const MIN_TURN = 10; // 10巡目以降を採用条件とする

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

const errs = [];
const warns = [];
const ids = new Set();

for (const q of data) {
  const id = q?.id ?? "(no id)";
  const E = (m) => errs.push(`${id}: ${m}`);
  const W = (m) => warns.push(`${id}: ${m}`);

  if (!q.id) E("id がない");
  if (ids.has(q.id)) E(`id 重複: ${q.id}`);
  ids.add(q.id);

  const ri = q.roundInfo, players = q.players, r = q.result, b = q.question;
  if (!ri || !players || !r || !b) { E("roundInfo/players/result/question のいずれかが欠落"); continue; }

  // 4人分の河がある
  const seats = players.map((p) => p.seat);
  for (const s of SEATS) if (!seats.includes(s)) E(`席 ${s} が欠落`);
  for (const p of players) {
    if (!Array.isArray(p.discards) || p.discards.length === 0) E(`${p.seat} の河が空`);
  }

  // 10巡目以降を優先（未満は warn）
  if (typeof ri.turn !== "number") E("roundInfo.turn がない");
  else if (ri.turn < MIN_TURN) W(`turn=${ri.turn} は ${MIN_TURN}巡目未満（採用は終盤局面を優先）`);

  // 牌は各種4枚まで（ドラ表示 + 全河 + 副露）
  const cnt = {};
  const add = (t) => (cnt[t] = (cnt[t] || 0) + 1);
  for (const d of ri.dora || []) add(d);
  for (const p of players) {
    for (const d of p.discards) add(d.tile);
    for (const m of p.melds || []) for (const t of m.tiles) add(t);
  }
  for (const [t, c] of Object.entries(cnt)) if (c > 4) E(`牌 ${t} が ${c} 枚（4枚制限超過）`);

  // ロン/ツモの結果がある・当たり牌が特定できる
  if (r.type !== "ron" && r.type !== "tsumo") E(`result.type が不正: ${r.type}`);
  if (!r.hiddenTile) E("result.hiddenTile がない（当たり牌を特定できない）");
  if (!Array.isArray(r.waits) || r.waits.length === 0) E("result.waits がない");
  if (r.type === "ron" && !r.loser) E("ロンなのに loser がない");

  // correctTile / hiddenTile / waits / choices の整合
  if (!b.correctTile) E("question.correctTile がない");
  if (b.correctTile !== r.hiddenTile) E(`correctTile(${b.correctTile}) ≠ hiddenTile(${r.hiddenTile})`);
  if (!Array.isArray(b.choices) || b.choices.length < 4) E("choices が4個未満");
  if (b.choices && !b.choices.includes(b.correctTile)) E("correctTile が choices に含まれない");
  if (Array.isArray(r.waits) && !r.waits.includes(r.hiddenTile)) E("hiddenTile が waits に含まれない");
  // 他の選択肢が当たり牌（waits）であってはならない（正解が一意でなくなる）
  for (const c of b.choices || [])
    if (c !== b.correctTile && (r.waits || []).includes(c)) E(`distractor ${c} が waits に含まれる（正解が一意でない）`);

  // 当たり牌だけを hiddenTile として伏せられる（ロン時: 放銃者の最終打牌が hiddenWinTile=true で hiddenTile 一致）
  const hw = [];
  for (const p of players) for (const d of p.discards) if (d.hiddenWinTile) hw.push([p.seat, d.tile]);
  if (r.type === "ron") {
    if (hw.length !== 1) E(`hiddenWinTile が ${hw.length} 個（ロンは1個）`);
    else {
      if (hw[0][1] !== r.hiddenTile) E(`hiddenWinTile の牌(${hw[0][1]}) ≠ hiddenTile(${r.hiddenTile})`);
      if (hw[0][0] !== r.loser) E(`hiddenWinTile が放銃者(${r.loser})ではなく ${hw[0][0]} にある`);
    }
  }

  // リーチ後は手出し（tedashi）不可（ルール整合）
  for (const p of players) {
    const idx = p.discards.findIndex((d) => d.isReachTile);
    if (p.reach && idx < 0) E(`${p.seat} は reach なのにリーチ宣言牌がない`);
    if (idx >= 0)
      for (let i = idx + 1; i < p.discards.length; i++)
        if (p.discards[i].type === "tedashi") E(`${p.seat} リーチ後に手出し（ルール違反）@${i}`);
  }

  // 読み根拠を1つ以上付与できる（readingBasis 推奨 / 最低 dangerReason）
  if ((!b.readingBasis || b.readingBasis.length === 0) && !b.dangerReason)
    E("読み根拠がない（readingBasis か dangerReason を1つ以上）");
  if (typeof b.dangerLevel !== "number" || b.dangerLevel < 1 || b.dangerLevel > 5)
    E("dangerLevel は 1〜5 の数値");

  // choiceReasons は非正解の全選択肢をカバー（推奨）
  const cr = new Set((b.choiceReasons || []).map((x) => x.tile));
  for (const c of b.choices || [])
    if (c !== b.correctTile && !cr.has(c)) W(`選択肢 ${c} の choiceReasons がない`);

  // 品質ランク（任意・あれば値域チェック）
  if (b.qualityRank && !["S", "A", "B", "C", "D"].includes(b.qualityRank))
    E(`qualityRank が不正: ${b.qualityRank}`);
}

console.log(`対象: ${target}`);
console.log(`問題数: ${data.length}`);
if (warns.length) console.log(`\n⚠ 警告 (${warns.length}):\n  ` + warns.join("\n  "));
if (errs.length) {
  console.log(`\n❌ エラー (${errs.length}):\n  ` + errs.join("\n  "));
  console.log("\n→ エラーがあるデータは採用せず rejected/quarantine 扱いにすること。");
  process.exit(1);
}
console.log("\n✅ 全件 PASS（採用可）");
