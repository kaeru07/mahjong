#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// /yomi 問題集の出典別集計
//   node scripts/yomi-stats.mjs [file]
//   鳳凰卓問題数 / 魂天問題数 / 王座問題数 等を sourceRank・sourceType ごとに集計。
// ─────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const RANK_LABEL = {
  houou: "鳳凰卓", tokujou: "特上卓", joukyuu: "上級卓", ippan: "一般卓",
  konten: "魂天", ouza: "王座の間", tama: "魂の間", manual: "手作成",
};
const TYPE_LABEL = { tenhou: "天鳳", majsoul: "雀魂", manual: "手作成" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(__dirname, "..", "data/yomi-questions.json");

const data = JSON.parse(readFileSync(target, "utf8"));
const byType = {}, byRank = {}, byDifficulty = {};
for (const q of data) {
  const t = q.question.source?.sourceType ?? "manual";
  const r = q.question.source?.sourceRank ?? "manual";
  const d = q.question.difficulty ?? "(none)";
  byType[t] = (byType[t] ?? 0) + 1;
  byRank[r] = (byRank[r] ?? 0) + 1;
  byDifficulty[d] = (byDifficulty[d] ?? 0) + 1;
}

const fmt = (obj, labels) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${(labels[k] ?? k).padEnd(8)} ${k.padEnd(10)} : ${v}`)
    .join("\n");

console.log(`対象: ${target}`);
console.log(`総問題数: ${data.length}\n`);
console.log("出典の卓・段位帯 (sourceRank):\n" + fmt(byRank, RANK_LABEL));
console.log("\n出典プラットフォーム (sourceType):\n" + fmt(byType, TYPE_LABEL));
console.log("\n難易度 (difficulty):\n" + fmt(byDifficulty, {}));

// よく使う集計を明示
const get = (r) => byRank[r] ?? 0;
console.log("\n主要集計:");
console.log(`  鳳凰卓問題数: ${get("houou")}`);
console.log(`  魂天問題数  : ${get("konten")}`);
console.log(`  王座問題数  : ${get("ouza")}`);
