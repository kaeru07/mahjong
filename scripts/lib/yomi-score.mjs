// ─────────────────────────────────────────────────────────────
// /yomi 候補問題の品質スコアリング（B→A 判定）
//
// 和了者(=待ちを読む対象)の河と盤面から「読み要素」を検出して加点し、
// 合計点で S/A/B/C を判定する。「なぜその判定か」も返す。
//
// 評価項目と配点:
//   無スジ +2 / スジ引っ掛け +3 / 壁 +1 / ワンチャンス +1 / 現物 +1
//   字牌処理 +2 / 対子落とし +2 / リャンメン落とし +2 / 染め手気配 +2 / リーチ宣言牌 +1
//
// 判定: コア読み要素が1つも無ければ C（読み筋を説明できない）。
//   それ以外で score>=7→S / >=5→A / >=3→B / else C
// ─────────────────────────────────────────────────────────────

const HONOR = ["東", "南", "西", "北", "白", "発", "中"];
const SUIT_CHAR = { "萬": "m", "筒": "p", "索": "s" };

export function parseTile(str) {
  const z = HONOR.indexOf(str);
  if (z >= 0) return { suit: "z", n: z + 1 };
  const n = parseInt(str, 10);
  const suit = SUIT_CHAR[str.slice(-1)] ?? "?";
  return { suit, n };
}

const CORE = new Set(["無スジ", "スジ引っ掛け", "壁", "ワンチャンス", "字牌処理", "対子落とし", "リャンメン落とし", "染め手気配"]);

// q: YomiQuestion 候補。{ score, rank, reasons:[{label,points,detail}], shortfall }
export function scoreQuestion(q) {
  const r = q.result;
  const ron = parseTile(r.hiddenTile);
  const winner = q.players.find((p) => p.seat === r.winner);
  const reasons = [];
  let score = 0;
  const add = (pts, label, detail) => { score += pts; reasons.push({ label, points: pts, detail }); };

  if (!winner) return { score: 0, rank: "C", reasons: [], shortfall: "和了者の河が特定できない" };

  // 盤面の見え枚数（全河＋ドラ＋副露）
  const vis = {};
  for (const p of q.players) {
    for (const d of p.discards) vis[d.tile] = (vis[d.tile] || 0) + 1;
    for (const m of p.melds || []) for (const t of m.tiles) vis[t] = (vis[t] || 0) + 1;
  }
  for (const d of q.roundInfo.dora || []) vis[d] = (vis[d] || 0) + 1;

  const wd = winner.discards;
  const wWind = wd.map((d) => parseTile(d.tile));

  // リーチ宣言牌
  if (winner.reach || wd.some((d) => d.isReachTile)) add(1, "リーチ宣言牌", "リーチ宣言牌があり待ちの起点が読める。");

  // スジ / 無スジ / スジ引っ掛け（数牌の中張）
  if (ron.suit !== "z" && ron.n >= 2 && ron.n <= 8) {
    const same = wWind.filter((t) => t.suit === ron.suit).map((t) => t.n);
    const sujiPresent = (ron.n - 3 >= 1 && same.includes(ron.n - 3)) || (ron.n + 3 <= 9 && same.includes(ron.n + 3));
    if (sujiPresent) add(3, "スジ引っ掛け", `${r.hiddenTile}は和了者の河のスジで安全に見えるが実際の当たり＝スジ引っ掛け。`);
    else add(2, "無スジ", `${r.hiddenTile}は和了者の河にスジ(${ron.n - 3 >= 1 ? ron.n - 3 : "-"}/${ron.n + 3 <= 9 ? ron.n + 3 : "-"})が無く無スジ。`);
  }

  // 字牌処理（字牌待ち）
  if (ron.suit === "z") add(2, "字牌処理", `${r.hiddenTile}は字牌待ち（単騎/シャンポン）。場に${vis[r.hiddenTile] || 0}枚見え。`);

  // 壁 / ワンチャンス（数牌）
  const wall = Object.entries(vis).filter(([t, c]) => c >= 4 && parseTile(t).suit !== "z").map(([t]) => t);
  const onech = Object.entries(vis).filter(([t, c]) => c === 3 && parseTile(t).suit !== "z").map(([t]) => t);
  if (wall.length) add(1, "壁", `場に4枚見えの壁(${wall.join("・")})があり安全範囲が読める。`);
  if (onech.length) add(1, "ワンチャンス", `場に3枚見え=ワンチャンス(${onech.slice(0, 3).join("・")})。`);

  // 現物（選択肢に和了者の現物を含む）
  const genbutsu = (q.question.choices || []).filter((c) => c !== r.hiddenTile && wd.some((d) => d.tile === c));
  if (genbutsu.length) add(1, "現物", `和了者の現物を選択肢に含む(${genbutsu.join("・")})。`);

  // 対子落とし（連続同一手出し）
  for (let i = 0; i + 1 < wd.length; i++) {
    if (wd[i].type === "tedashi" && wd[i + 1].type === "tedashi" && wd[i].tile === wd[i + 1].tile) {
      add(2, "対子落とし", `和了者が${wd[i].tile}を連続手出し＝対子落とし。`); break;
    }
  }
  // リャンメン落とし（同色隣接の連続手出し）
  for (let i = 0; i + 1 < wd.length; i++) {
    if (wd[i].type === "tedashi" && wd[i + 1].type === "tedashi") {
      const a = parseTile(wd[i].tile), b = parseTile(wd[i + 1].tile);
      if (a.suit !== "z" && a.suit === b.suit && Math.abs(a.n - b.n) === 1) {
        add(2, "リャンメン落とし", `和了者が${wd[i].tile}${wd[i + 1].tile}を連続手出し＝リャンメン落とし。`); break;
      }
    }
  }

  // 染め手気配（和了色を河にほぼ切らず他色多数 / 副露あり）
  if (ron.suit !== "z") {
    const cnt = { m: 0, p: 0, s: 0, z: 0 };
    for (const t of wWind) cnt[t.suit]++;
    const otherNum = ["m", "p", "s"].filter((s) => s !== ron.suit).reduce((a, s) => a + cnt[s], 0);
    const hasMeld = (winner.melds && winner.melds.length) || (q.question.tags || []).includes("副露あり");
    if (wd.length >= 6 && cnt[ron.suit] <= 1 && (otherNum >= 5 || hasMeld))
      add(2, "染め手気配", `和了者は${r.hiddenTile.slice(-1)}を河にほぼ切らず(${cnt[ron.suit]}枚)他色多数=染め気配。`);
  }

  // 判定
  const hasCore = reasons.some((x) => CORE.has(x.label));
  let rank, shortfall = null;
  if (!hasCore) { rank = "C"; shortfall = "コア読み要素なし（現物/リーチのみ＝読み筋を説明できない）"; }
  else if (score >= 7) rank = "S";
  else if (score >= 5) rank = "A";
  else if (score >= 3) { rank = "B"; shortfall = "コア要素はあるが加点不足（読み要素が単発）"; }
  else { rank = "C"; shortfall = "読み要素が弱い（score<3）"; }

  return { score, rank, reasons, shortfall };
}

// スコア結果から候補に qualityRank / dangerLevel / readingBasis / explanation を反映
export function applyScore(q) {
  const s = scoreQuestion(q);
  q.question.qualityRank = s.rank;
  q.question.dangerLevel = s.rank === "S" ? 5 : s.rank === "A" ? 4 : s.rank === "B" ? 3 : 2;
  if (s.reasons.length) q.question.readingBasis = s.reasons.map((x) => ({ label: x.label, detail: x.detail }));
  const why = s.reasons.map((x) => `${x.label}+${x.points}`).join(", ");
  q.question.explanation =
    `天鳳鳳凰卓の実戦譜から自動抽出・自動採点した放銃局面。当たり牌=実際のロン牌。` +
    `判定: ${s.rank}(score=${s.score})｜内訳: ${why || "なし"}` + (s.shortfall ? `｜不足: ${s.shortfall}` : "");
  return s;
}
