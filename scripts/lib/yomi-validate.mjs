// ─────────────────────────────────────────────────────────────
// /yomi 問題データの整合検証（共有モジュール）
// validate-yomi.mjs と ingest-yomi.mjs から利用。
// 取り込みルール: docs/yomi-ingestion.md
// ─────────────────────────────────────────────────────────────

import { validateSourceValidationShape } from "./yomi-source-validate.mjs";

export const SEATS = ["self", "shimocha", "toimen", "kamicha"];
export const MIN_TURN = 10; // 10巡目以降を採用条件とする

// 1問の整合検証。errors=採用不可 / warns=採用可だが注意。
export function validateQuestion(q, { seenIds } = {}) {
  const errors = [];
  const warns = [];
  const id = q?.id ?? "(no id)";
  const E = (m) => errors.push(`${id}: ${m}`);
  const W = (m) => warns.push(`${id}: ${m}`);

  if (!q || typeof q !== "object") { E("問題オブジェクトが不正"); return { errors, warns }; }
  if (!q.id) E("id がない");
  if (seenIds) {
    if (seenIds.has(q.id)) E(`id 重複: ${q.id}`);
    else seenIds.add(q.id);
  }

  const ri = q.roundInfo, players = q.players, r = q.result, b = q.question;
  if (!ri || !players || !r || !b) { E("roundInfo/players/result/question のいずれかが欠落"); return { errors, warns }; }

  // 4人分の河がある
  const seats = players.map((p) => p.seat);
  for (const s of SEATS) if (!seats.includes(s)) E(`席 ${s} が欠落`);
  for (const p of players)
    if (!Array.isArray(p.discards) || p.discards.length === 0) E(`${p.seat} の河が空`);

  // 10巡目以降を優先
  if (typeof ri.turn !== "number") E("roundInfo.turn がない");
  else if (ri.turn < MIN_TURN) W(`turn=${ri.turn} は ${MIN_TURN}巡目未満（採用は終盤局面を優先）`);

  // 牌は各種4枚まで
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
  for (const c of b.choices || [])
    if (c !== b.correctTile && (r.waits || []).includes(c)) E(`distractor ${c} が waits に含まれる（正解が一意でない）`);

  // 当たり牌だけを hiddenTile として伏せられる（ロン時）
  const hw = [];
  for (const p of players) for (const d of p.discards) if (d.hiddenWinTile) hw.push([p.seat, d.tile]);
  if (r.type === "ron") {
    if (hw.length !== 1) E(`hiddenWinTile が ${hw.length} 個（ロンは1個）`);
    else {
      if (hw[0][1] !== r.hiddenTile) E(`hiddenWinTile の牌(${hw[0][1]}) ≠ hiddenTile(${r.hiddenTile})`);
      if (hw[0][0] !== r.loser) E(`hiddenWinTile が放銃者(${r.loser})ではなく ${hw[0][0]} にある`);
    }
  }

  // リーチ後は手出し不可
  for (const p of players) {
    const idx = p.discards.findIndex((d) => d.isReachTile);
    if (p.reach && idx < 0) E(`${p.seat} は reach なのにリーチ宣言牌がない`);
    if (idx >= 0)
      for (let i = idx + 1; i < p.discards.length; i++)
        if (p.discards[i].type === "tedashi") E(`${p.seat} リーチ後に手出し（ルール違反）@${i}`);
  }

  // 読み根拠を1つ以上付与できる
  if ((!b.readingBasis || b.readingBasis.length === 0) && !b.dangerReason)
    E("読み根拠がない（readingBasis か dangerReason を1つ以上）");
  if (typeof b.dangerLevel !== "number" || b.dangerLevel < 1 || b.dangerLevel > 5)
    E("dangerLevel は 1〜5 の数値");

  // choiceReasons は非正解の全選択肢をカバー（推奨）
  const cr = new Set((b.choiceReasons || []).map((x) => x.tile));
  for (const c of b.choices || [])
    if (c !== b.correctTile && !cr.has(c)) W(`選択肢 ${c} の choiceReasons がない`);

  // 品質ランク
  if (b.qualityRank && !["S", "A", "B", "C", "D"].includes(b.qualityRank))
    E(`qualityRank が不正: ${b.qualityRank}`);

  // 出典（任意）: 生牌譜ポインタを保持していないこと
  if (b.source) {
    for (const banned of ["gameId", "mjlog", "xml", "mjai", "raw"])
      if (banned in b.source) E(`source.${banned} は保持禁止（生牌譜ポインタ・再配布防止）`);
  }

  // 原本再現性の検証（任意）: 形式が壊れていないこと
  if (b.sourceValidation) {
    for (const m of validateSourceValidationShape(b.sourceValidation, id)) errors.push(m);
    // 原本差分 failed の問題は採用不可（原本との差分をレビューせずに S/A 採用しない）
    if (b.sourceValidation.status === "failed" && (b.qualityRank === "S" || b.qualityRank === "A"))
      E(`原本差分が failed なのに qualityRank=${b.qualityRank}（原本差分 failed は S/A 採用不可）`);
  }

  return { errors, warns };
}

// 配列全体を検証。{ errors, warns } を返す。
export function validateQuestions(arr) {
  const errors = [];
  const warns = [];
  const seenIds = new Set();
  for (const q of arr) {
    const r = validateQuestion(q, { seenIds });
    errors.push(...r.errors);
    warns.push(...r.warns);
  }
  return { errors, warns };
}

// 盤面の重複判定シグネチャ（id 以外での重複検出に使用）
export function boardSignature(q) {
  const parts = [];
  for (const s of SEATS) {
    const p = (q.players || []).find((x) => x.seat === s);
    parts.push(s + ":" + (p ? p.discards.map((d) => d.tile).join(",") : ""));
  }
  parts.push("win:" + q.result?.hiddenTile + "/" + q.result?.type + "/" + q.result?.winner);
  return parts.join("|");
}
