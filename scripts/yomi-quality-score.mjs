#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// /yomi 候補の品質採点・レポート
//   node scripts/yomi-quality-score.mjs <candidates.json> [--out graded.json]
//
// 各候補を scoreQuestion で S/A/B/C 判定し、分布・A判定サンプル・不採用理由上位を出力。
// --out 指定時は採点反映済み候補(qualityRank/readingBasis付与)を書き出す。
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { scoreQuestion, applyScore } from "./lib/yomi-score.mjs";

const args = process.argv.slice(2);
let out = null;
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i]; else pos.push(args[i]);
}
if (!pos.length) { console.error("使い方: node scripts/yomi-quality-score.mjs <candidates.json> [--out graded.json]"); process.exit(2); }
const cands = JSON.parse(readFileSync(resolve(process.cwd(), pos[0]), "utf8"));

const dist = { S: 0, A: 0, B: 0, C: 0 };
const aSamples = [];
const shortfalls = {};
const graded = [];

for (const q of cands) {
  const s = scoreQuestion(q);
  dist[s.rank]++;
  if (s.rank === "A" && aSamples.length < 3) {
    aSamples.push({
      id: q.id, ron: q.result.hiddenTile, turn: q.roundInfo.turn, score: s.score,
      why: s.reasons.map((x) => `${x.label}+${x.points}`).join(", "),
    });
  }
  if (s.rank === "B" || s.rank === "C") {
    const key = s.shortfall || "その他";
    shortfalls[key] = (shortfalls[key] || 0) + 1;
  }
  if (out) { const c = JSON.parse(JSON.stringify(q)); applyScore(c); graded.push(c); }
}

if (out) { writeFileSync(resolve(process.cwd(), out), JSON.stringify(graded, null, 2) + "\n"); }

console.log("==== /yomi 候補 品質採点 ====");
console.log(`候補数: ${cands.length}`);
console.log(`S: ${dist.S}  A: ${dist.A}  B: ${dist.B}  C: ${dist.C}`);
console.log(`採用相当(S/A): ${dist.S + dist.A}  不採用(B/C): ${dist.B + dist.C}`);

console.log("\n--- A判定サンプル(最大3件) ---");
if (aSamples.length === 0) console.log("  (なし)");
for (const a of aSamples) console.log(`  ${a.id} | ron=${a.ron} turn=${a.turn} score=${a.score}\n    なぜA: ${a.why}`);

console.log("\n--- 不採用理由 上位 ---");
const top = Object.entries(shortfalls).sort((x, y) => y[1] - x[1]).slice(0, 5);
if (top.length === 0) console.log("  (なし)");
for (const [reason, n] of top) console.log(`  ${n}件: ${reason}`);
