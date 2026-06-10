// ─────────────────────────────────────────────────────────────
// /yomi 原本再現性の検証（共有モジュール）
//
// 「アプリが表示する問題(rendered)」と「原本(original: 牌譜JSON / 原本画像の書き起こし)」を
// 14項目で突き合わせ、再現された項目・欠落/不一致の項目を機械的に検出する。
//
// 利用元: scripts/yomi-source-report.mjs（差分レポートCLI） / scripts/ingest-yomi.mjs（採用ゲート）
// 型の正本: types/yomi.ts の SourceValidation。
// ルール: docs/yomi-ingestion.md §「原本再現性の検証」
// ─────────────────────────────────────────────────────────────

export const SEATS = ["self", "shimocha", "toimen", "kamicha"];
export const SEAT_LABEL = { self: "自分", shimocha: "下家", toimen: "対面", kamicha: "上家" };

// 一致率がこの値未満なら failed
export const MATCH_RATE_FAIL_THRESHOLD = 0.5;
// 不一致でも致命扱いにする項目（1つでも mismatch なら failed）
export const CRITICAL_FIELDS = new Set(["winner", "loser", "turn"]);

// 14項目の定義（field キー → 日本語ラベル）。表示順もこの順。
export const VALIDATION_FIELDS = [
  ["playerSeats", "プレイヤー位置"],
  ["selfWind", "自風"],
  ["bakaze", "場風"],
  ["riverCounts", "河枚数"],
  ["riverOrder", "河順序"],
  ["handCounts", "手牌枚数"],
  ["meldContent", "鳴き内容"],
  ["meldPosition", "鳴き位置"],
  ["dora", "ドラ"],
  ["turn", "巡目"],
  ["scores", "点数"],
  ["reach", "リーチ有無"],
  ["loser", "放銃者"],
  ["winner", "和了者"],
];

function bySeat(players) {
  const m = {};
  for (const p of players || []) m[p.seat] = p;
  return m;
}
function discardTiles(p) {
  return (p?.discards || []).map((d) => d.tile);
}
function meldSig(p) {
  // 鳴き内容の比較用シグネチャ（種別+牌の並び）
  return (p?.melds || [])
    .map((m) => `${m.type}:${(m.tiles || []).join("")}`)
    .sort()
    .join(" / ");
}
function meldFromSig(p) {
  // 鳴き位置（誰から鳴いたか）の比較用シグネチャ
  return (p?.melds || [])
    .map((m) => `${m.type}<-${m.from ?? "?"}`)
    .sort()
    .join(" / ");
}
function arrEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// 1項目の比較ヘルパ。orig===undefined（原本に該当データなし）→ unknown。
function cmp(field, label, origVal, rendVal, opts = {}) {
  const { eq = (a, b) => a === b, fmt = (v) => String(v), missingWhen } = opts;
  // 原本側にデータが無い → 検証不能（一致率の分母に含めない）
  if (origVal === undefined || origVal === null) {
    return { field, label, result: "unknown", original: undefined, rendered: rendVal === undefined ? undefined : fmt(rendVal) };
  }
  // 原本にデータがあるのに rendered 側が欠落 → missing
  const renderedMissing = missingWhen ? missingWhen(rendVal) : (rendVal === undefined || rendVal === null);
  if (renderedMissing) {
    return { field, label, result: "missing", original: fmt(origVal), rendered: "(欠落)" };
  }
  if (eq(origVal, rendVal)) {
    return { field, label, result: "match", original: fmt(origVal), rendered: fmt(rendVal) };
  }
  return { field, label, result: "mismatch", original: fmt(origVal), rendered: fmt(rendVal) };
}

// rendered（問題オブジェクト）と original（原本の盤面・部分可）を14項目で突き合わせる。
// rendered: YomiQuestion 形（roundInfo/players/result/question）
// original: { roundInfo?, players?, result?, hands? } いずれも部分指定可。無い項目は unknown。
// originalKind: "json" | "image" | "none"
export function compareToOriginal(rendered, original, { originalKind = "json", reviewedBy } = {}) {
  const checks = [];
  const diffSummary = [];

  const oRi = original?.roundInfo ?? {};
  const rRi = rendered?.roundInfo ?? {};
  const oP = bySeat(original?.players);
  const rP = bySeat(rendered?.players);
  const oRes = original?.result ?? {};
  const rRes = rendered?.result ?? {};
  // 原本側に players があるか（席・自風・河などの比較可否判定に使う）
  const hasOrigPlayers = Array.isArray(original?.players) && original.players.length > 0;

  // 1. プレイヤー位置（席集合）
  checks.push(
    cmp(
      "playerSeats", "プレイヤー位置",
      hasOrigPlayers ? [...Object.keys(oP)].sort() : undefined,
      [...Object.keys(rP)].sort(),
      { eq: arrEq, fmt: (v) => v.map((s) => SEAT_LABEL[s] ?? s).join("・") },
    ),
  );

  // 席ごとに走査する項目（自風・河枚数・河順序・鳴き・リーチ・点数・手牌）
  // 各 result は「席ごとの不一致」をまとめて1項目に集約する。
  const perSeat = (field, label, getOrig, getRend, eq, fmtSeat) => {
    if (!hasOrigPlayers) {
      checks.push({ field, label, result: "unknown" });
      return;
    }
    const mismatches = [];
    const missings = [];
    let comparable = 0;
    for (const seat of SEATS) {
      const op = oP[seat];
      if (!op) continue; // 原本にその席が無い→その席は検証対象外
      const ov = getOrig(op);
      if (ov === undefined || ov === null) continue;
      comparable++;
      const rp = rP[seat];
      const rv = rp ? getRend(rp) : undefined;
      if (rv === undefined || rv === null) {
        missings.push(`${SEAT_LABEL[seat]}${fmtSeat ? "" : ""}欠落`);
        continue;
      }
      if (!eq(ov, rv)) mismatches.push(fmtSeat(seat, ov, rv));
    }
    if (comparable === 0) {
      checks.push({ field, label, result: "unknown" });
      return;
    }
    if (missings.length === 0 && mismatches.length === 0) {
      checks.push({ field, label, result: "match" });
    } else if (mismatches.length > 0) {
      const note = [...mismatches, ...missings].join(" / ");
      checks.push({ field, label, result: "mismatch", note });
      diffSummary.push(...mismatches);
      diffSummary.push(...missings);
    } else {
      const note = missings.join(" / ");
      checks.push({ field, label, result: "missing", note });
      diffSummary.push(...missings);
    }
  };

  // 2. 自風
  perSeat(
    "selfWind", "自風",
    (p) => p.wind, (p) => p.wind,
    (a, b) => a === b,
    (seat, o, r) => `${SEAT_LABEL[seat]}自風 ${o}→${r}不一致`,
  );

  // 3. 場風
  checks.push(cmp("bakaze", "場風", oRi.bakaze, rRi.bakaze));

  // 4. 河枚数
  perSeat(
    "riverCounts", "河枚数",
    (p) => (p.discards ? p.discards.length : undefined),
    (p) => (p.discards ? p.discards.length : undefined),
    (a, b) => a === b,
    (seat, o, r) => `${SEAT_LABEL[seat]}河 ${o}枚 → ${r}枚`,
  );

  // 5. 河順序（捨て牌の並び）
  perSeat(
    "riverOrder", "河順序",
    (p) => (p.discards ? discardTiles(p) : undefined),
    (p) => (p.discards ? discardTiles(p) : undefined),
    arrEq,
    (seat, o, r) => `${SEAT_LABEL[seat]}河順序が不一致`,
  );

  // 6. 手牌枚数（原本に hands があれば。問題側は通常持たない＝欠落として検出）
  {
    const oHands = original?.hands; // { seat: tile[] } 想定（任意）
    if (oHands && typeof oHands === "object") {
      const mismatches = [];
      const missings = [];
      let comparable = 0;
      for (const seat of SEATS) {
        const oh = oHands[seat];
        if (!Array.isArray(oh)) continue;
        comparable++;
        const rh = rendered?.players ? (rP[seat]?.hand) : undefined; // 問題側 hand（基本無し）
        if (!Array.isArray(rh)) { missings.push(`${SEAT_LABEL[seat]}手牌欠落`); continue; }
        if (rh.length !== oh.length) mismatches.push(`${SEAT_LABEL[seat]}手牌 ${oh.length}枚 → ${rh.length}枚`);
      }
      if (comparable === 0) checks.push({ field: "handCounts", label: "手牌枚数", result: "unknown" });
      else if (mismatches.length) { checks.push({ field: "handCounts", label: "手牌枚数", result: "mismatch", note: [...mismatches, ...missings].join(" / ") }); diffSummary.push(...mismatches, ...missings); }
      else if (missings.length) { checks.push({ field: "handCounts", label: "手牌枚数", result: "missing", note: missings.join(" / ") }); diffSummary.push(...missings); }
      else checks.push({ field: "handCounts", label: "手牌枚数", result: "match" });
    } else {
      checks.push({ field: "handCounts", label: "手牌枚数", result: "unknown" });
    }
  }

  // 7. 鳴き内容
  perSeat(
    "meldContent", "鳴き内容",
    (p) => (p.melds && p.melds.length ? meldSig(p) : (p.melds ? "" : undefined)),
    (p) => meldSig(p),
    (a, b) => a === b,
    (seat, o, r) => (r === "" && o !== "" ? `${SEAT_LABEL[seat]}鳴き欠落` : `${SEAT_LABEL[seat]}鳴き内容 [${o}] → [${r}]`),
  );

  // 8. 鳴き位置（誰から鳴いたか）
  perSeat(
    "meldPosition", "鳴き位置",
    (p) => (p.melds && p.melds.length ? meldFromSig(p) : (p.melds ? "" : undefined)),
    (p) => meldFromSig(p),
    (a, b) => a === b,
    (seat, o, r) => `${SEAT_LABEL[seat]}鳴き位置 [${o}] → [${r}]`,
  );

  // 9. ドラ
  checks.push(cmp("dora", "ドラ", oRi.dora, rRi.dora, { eq: arrEq, fmt: (v) => (Array.isArray(v) ? v.join("・") : String(v)) }));

  // 10. 巡目
  checks.push(cmp("turn", "巡目", oRi.turn, rRi.turn, { fmt: (v) => `${v}巡目` }));

  // 11. 点数
  perSeat(
    "scores", "点数",
    (p) => p.score, (p) => p.score,
    (a, b) => a === b,
    (seat, o, r) => `${SEAT_LABEL[seat]}点数 ${o} → ${r}`,
  );

  // 12. リーチ有無
  perSeat(
    "reach", "リーチ有無",
    (p) => Boolean(p.reach), (p) => Boolean(p.reach),
    (a, b) => a === b,
    (seat, o, r) => `${SEAT_LABEL[seat]}リーチ ${o ? "有" : "無"} → ${r ? "有" : "無"}`,
  );

  // 13. 放銃者
  checks.push(cmp("loser", "放銃者", oRes.loser, rRes.loser, { fmt: (v) => SEAT_LABEL[v] ?? v }));
  if (checks[checks.length - 1].result === "mismatch") diffSummary.push(`放銃者 ${SEAT_LABEL[oRes.loser] ?? oRes.loser} → ${SEAT_LABEL[rRes.loser] ?? rRes.loser}不一致`);

  // 14. 和了者
  checks.push(cmp("winner", "和了者", oRes.winner, rRes.winner, { fmt: (v) => SEAT_LABEL[v] ?? v }));
  if (checks[checks.length - 1].result === "mismatch") diffSummary.push(`和了者 ${SEAT_LABEL[oRes.winner] ?? oRes.winner} → ${SEAT_LABEL[rRes.winner] ?? rRes.winner}不一致`);

  // 集計（unknown は分母から除外）
  const checked = checks.filter((c) => c.result !== "unknown");
  const matched = checks.filter((c) => c.result === "match");
  const checkedCount = checked.length;
  const matchedCount = matched.length;
  const matchRate = checkedCount === 0 ? 0 : matchedCount / checkedCount;

  // ステータス判定
  const hasMismatch = checks.some((c) => c.result === "mismatch");
  const hasMissing = checks.some((c) => c.result === "missing");
  const criticalMismatch = checks.some((c) => c.result === "mismatch" && CRITICAL_FIELDS.has(c.field));
  let status;
  if (checkedCount === 0) {
    status = "failed"; // 何も検証できない＝原本照合不成立
  } else if (criticalMismatch || matchRate < MATCH_RATE_FAIL_THRESHOLD) {
    status = "failed";
  } else if (!hasMismatch && !hasMissing && matchRate === 1) {
    status = "exact";
  } else {
    status = "partial";
  }

  return {
    validatedAt: new Date().toISOString(),
    hasOriginal: originalKind !== "none",
    originalKind,
    status,
    matchRate: Math.round(matchRate * 1000) / 1000,
    checkedCount,
    matchedCount,
    checks,
    diffSummary: diffSummary.length ? diffSummary : undefined,
    ...(reviewedBy ? { reviewedBy } : {}),
  };
}

// SourceValidation を人が読む差分レポート文字列にする
export function formatDiffReport(id, sv) {
  const lines = [];
  const pct = (sv.matchRate * 100).toFixed(0);
  const mark = { exact: "✅", partial: "⚠️", failed: "❌" }[sv.status] ?? "?";
  lines.push(`${mark} ${id}  status=${sv.status}  一致率=${pct}% (${sv.matchedCount}/${sv.checkedCount})  原本=${sv.originalKind}`);
  for (const c of sv.checks) {
    const sym = { match: "○", mismatch: "×", missing: "△", unknown: "—" }[c.result] ?? "?";
    let line = `   ${sym} ${c.label}`;
    if (c.result === "unknown") line += "（原本に該当データなし）";
    else if (c.note) line += `: ${c.note}`;
    else if (c.result !== "match" && (c.original !== undefined || c.rendered !== undefined))
      line += `: 原本[${c.original ?? "?"}] → 表示[${c.rendered ?? "?"}]`;
    lines.push(line);
  }
  if (sv.diffSummary && sv.diffSummary.length) {
    lines.push(`   差分: ${sv.diffSummary.join(" / ")}`);
  }
  return lines.join("\n");
}

// sourceValidation オブジェクトの形式検証（yomi-validate から呼ぶ）。errors を返す。
export function validateSourceValidationShape(sv, id = "(no id)") {
  const errors = [];
  if (sv == null) return errors;
  if (typeof sv !== "object") { errors.push(`${id}: sourceValidation がオブジェクトでない`); return errors; }
  if (!["exact", "partial", "failed"].includes(sv.status))
    errors.push(`${id}: sourceValidation.status が不正: ${sv.status}`);
  if (typeof sv.matchRate !== "number" || sv.matchRate < 0 || sv.matchRate > 1)
    errors.push(`${id}: sourceValidation.matchRate は 0〜1 の数値`);
  if (!Array.isArray(sv.checks)) errors.push(`${id}: sourceValidation.checks が配列でない`);
  return errors;
}
