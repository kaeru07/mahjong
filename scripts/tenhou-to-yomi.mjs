#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// 天鳳 mjlog(XML) → /yomi 候補問題 変換器（試験用・最小実装）
//
//   node scripts/tenhou-to-yomi.mjs <mjlog.xml> --out <candidates.json>
//     [--source-type tenhou] [--source-rank houou] [--min-turn 10] [--max 5]
//
// 抽出: ロン放銃局（4人河・turn>=min）を /yomi 候補へ変換。放銃者=self視点。
// 当たり牌=実際のロン牌。distractor=和了者の河（自分の捨て牌＝フリテンで待てない＝安全）。
//
// 重要:
//  - 生牌譜・gameId 等の牌譜ポインタは候補に残さない（id はハッシュ化）。
//  - 読み筋は自動付与しないため qualityRank は付けない（=ingest側で B保留→不採用）。
//    人手/ヒューリスティックで読み筋を検証してから S/A 昇格する想定。
//  - 副露(<N>)の河はTenhouの捨て牌列をそのまま使う簡易実装（B品質の試験用）。
//
// ルール詳細: docs/yomi-ingestion.md / docs/tenhou-collection.md
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = { out: null, sourceType: "tenhou", sourceRank: "houou", minTurn: 10, max: 5 };
const pos = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--out") opt.out = args[++i];
  else if (a === "--source-type") opt.sourceType = args[++i];
  else if (a === "--source-rank") opt.sourceRank = args[++i];
  else if (a === "--min-turn") opt.minTurn = parseInt(args[++i], 10);
  else if (a === "--max") opt.max = parseInt(args[++i], 10);
  else pos.push(a);
}
if (pos.length === 0) { console.error("使い方: node scripts/tenhou-to-yomi.mjs <mjlog.xml> --out <file> [--source-rank houou]"); process.exit(2); }
const xml = readFileSync(resolve(process.cwd(), pos[0]), "utf8");

// 牌id(0-135) → 表記
const SUIT = ["萬", "筒", "索"];
const HONOR = ["東", "南", "西", "北", "白", "発", "中"];
function tile(id) {
  const suit = Math.floor(id / 36);
  const rank = Math.floor((id % 36) / 4) + 1;
  if (suit === 3) return HONOR[rank - 1];
  return rank + SUIT[suit];
}
// 牌譜を辿れないよう ref+kyoku から非可逆ハッシュで id を作る
function hashId(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return "t-" + h.toString(36);
}
const REL = ["self", "shimocha", "toimen", "kamicha"];
const WIND = ["東", "南", "西", "北"];

function parseAttrs(s) {
  const o = {};
  for (const m of s.matchAll(/([A-Za-z0-9_]+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}

// ref（牌譜ID）は id ハッシュの種にだけ使い、出力には残さない
const refMatch = xml.match(/log=([0-9a-z-]+)/i);
const refSeed = refMatch ? refMatch[1] : String(Math.random());

const candidates = [];
let st = null; // 局状態
let oya = 0;
let kyokuIdx = -1;

for (const m of xml.matchAll(/<([^>\/\s]+)((?:\s+[^=\s]+="[^"]*")*)\s*\/?>/g)) {
  const head = m[1];
  const attrs = parseAttrs(m[2] || "");
  const lead = (head.match(/^[A-Za-z]+/) || [""])[0];
  const num = head.slice(lead.length);

  if (lead === "INIT") {
    kyokuIdx++;
    const seed = (attrs.seed || "").split(",").map(Number);
    const ten = (attrs.ten || "0,0,0,0").split(",").map(Number);
    oya = parseInt(attrs.oya ?? "0", 10);
    st = {
      kyoku: seed[0] ?? 0, honba: seed[1] ?? 0, kyotaku: seed[2] ?? 0,
      dora: [tile(seed[5])], ten,
      rivers: [[], [], [], []], lastDraw: [null, null, null, null],
      reachPending: [false, false, false, false], reached: [false, false, false, false],
      hasMeld: [false, false, false, false],
    };
    continue;
  }
  if (!st) continue;

  if (["T", "U", "V", "W"].includes(lead) && num !== "") {
    st.lastDraw["TUVW".indexOf(lead)] = parseInt(num, 10);
    continue;
  }
  if (["D", "E", "F", "G"].includes(lead) && num !== "") {
    const p = "DEFG".indexOf(lead);
    const t = parseInt(num, 10);
    const d = { tile: tile(t), type: t === st.lastDraw[p] ? "tsumogiri" : "tedashi", _id: t };
    if (st.reachPending[p]) { d.isReachTile = true; st.reachPending[p] = false; st.reached[p] = true; }
    st.rivers[p].push(d);
    continue;
  }
  if (lead === "REACH") {
    const who = parseInt(attrs.who, 10);
    if (attrs.step === "1") st.reachPending[who] = true;
    continue;
  }
  if (lead === "N") { st.hasMeld[parseInt(attrs.who, 10)] = true; continue; }
  if (lead === "DORA" && attrs.hai != null) { st.dora.push(tile(parseInt(attrs.hai, 10))); continue; }

  if (lead === "AGARI") {
    const who = parseInt(attrs.who, 10);
    const from = parseInt(attrs.fromWho, 10);
    if (who === from) continue; // ツモは今回対象外（放銃読みの/yomiはロン）
    const machiId = parseInt((attrs.machi ?? "").split(",")[0], 10);
    const ronTile = Number.isFinite(machiId) ? tile(machiId) : null;
    const loser = from, winner = who;
    const turn = st.rivers[loser].length;
    if (!ronTile || turn < opt.minTurn) continue;

    // 放銃者の最終打牌=ロン牌に hiddenWinTile を付与
    const lastDisc = st.rivers[loser][st.rivers[loser].length - 1];
    if (!lastDisc || lastDisc.tile !== ronTile) continue; // 整合しない局はスキップ
    lastDisc.hiddenWinTile = true;

    // players（self=放銃者 起点の相対席）
    const players = [];
    for (let abs = 0; abs < 4; abs++) {
      const rel = (abs - loser + 4) % 4;
      players.push({
        seat: REL[rel],
        wind: WIND[(abs - oya + 4) % 4],
        score: (st.ten[abs] ?? 0) * 100,
        discards: st.rivers[abs].map((d) => {
          const o = { tile: d.tile, type: d.type };
          if (d.isReachTile) o.isReachTile = true;
          if (d.hiddenWinTile) o.hiddenWinTile = true;
          return o;
        }),
        ...(st.reached[abs] ? { reach: true } : {}),
      });
    }
    players.sort((a, b) => REL.indexOf(a.seat) - REL.indexOf(b.seat));

    // distractor = 和了者の河（自分の捨て牌＝フリテンで待てない＝安全）
    const winnerTiles = [...new Set(st.rivers[winner].map((d) => d.tile))].filter((t) => t !== ronTile);
    const choices = [ronTile];
    for (const t of winnerTiles) { if (choices.length >= 4) break; choices.push(t); }
    // 足りなければ字牌などで補う（waits=[ronTile]のみなので非当たり）
    for (const t of [...HONOR, "1萬", "9筒", "9索"]) { if (choices.length >= 4) break; if (!choices.includes(t)) choices.push(t); }

    const choiceReasons = choices.filter((t) => t !== ronTile).map((t) => ({
      tile: t, reason: "和了者の河にある現物＝フリテンで待てない安全牌（自動判定）。",
    }));

    candidates.push({
      id: hashId(refSeed + "#" + kyokuIdx),
      roundInfo: {
        bakaze: st.kyoku < 4 ? "東" : "南", kyoku: (st.kyoku % 4) + 1,
        honba: st.honba, kyotaku: st.kyotaku, dora: st.dora.slice(0, 1), turn,
      },
      players,
      result: {
        type: "ron", winner: REL[(winner - loser + 4) % 4], loser: "self",
        hiddenTile: ronTile, waits: [ronTile], waitShape: "(自動抽出)", yaku: ["ロン"],
      },
      question: {
        text: "実戦譜（天鳳鳳凰卓）。放銃した当たり牌はどれ？",
        choices, correctTile: ronTile,
        explanation: "天鳳鳳凰卓の実戦譜から自動抽出した放銃局面。当たり牌は実際のロン牌。読み筋・危険度は自動付与のため未検証（要レビュー）。",
        readingPoints: ["自動抽出した局面。読み筋は人手/ヒューリスティックで検証後に付与する。"],
        difficulty: "medium",
        dangerLevel: 3,
        tags: ["鳳凰卓", "自動生成", "ロン", ...(st.hasMeld[winner] ? ["副露あり"] : [])],
        dangerReason: "自動生成のため危険理由は未検証。",
        readingBasis: [{ label: "自動抽出", detail: "天鳳鳳凰卓の実戦譜から自動生成。読み筋は未検証（B保留・要レビュー）。" }],
        choiceReasons,
        source: { sourceType: opt.sourceType, sourceRank: opt.sourceRank, importedAt: new Date().toISOString() },
        // qualityRank は付けない → ingest 側で B保留（不採用）。人手検証後に S/A 昇格する。
      },
    });
    if (candidates.length >= opt.max) break;
  }
}

const outJson = JSON.stringify(candidates, null, 2) + "\n";
if (opt.out) { writeFileSync(resolve(process.cwd(), opt.out), outJson); console.error(`wrote ${candidates.length} candidate(s) -> ${opt.out}`); }
else process.stdout.write(outJson);
console.error(`抽出ロン局: ${candidates.length} 件 (turn>=${opt.minTurn})`);
