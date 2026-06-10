"use client";

// ─────────────────────────────────────────────────────────────
// /yomi/review — AI 良問判定 × 人間評価 すり合わせレビュー画面
//
// 目的: AI の S/A/B/C 判定が人間の感覚と一致するか検証する。
//   ・各問の 問題ID / 盤面 / 河 / 当たり牌 / AIスコア / AI判定理由 を表示
//   ・人間が S/A/B/C を付与（localStorage 保存）
//   ・AI判定 vs 人間判定 の一致率・過大/過小評価トップ5・修正案を集計
//
// 人間評価は localStorage("yomiReviewRatings") に { [id]: rank } で保存。
// 集計はクライアント側で即時再計算する。
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAllYomiQuestions,
  getYomiSourceRankLabel,
  getSourceValidationStatusLabel,
  getSourceValidationStatusClass,
  formatMatchRate,
} from "@/lib/yomi";
import { scoreQuestion, RANK_NUM, RANK_ORDER, type YomiRank } from "@/lib/yomiScore";
import { YomiQuestion } from "@/types/yomi";
import YomiBoardView from "@/components/YomiBoardView";

const STORAGE_KEY = "yomiReviewRatings";

type RatingMap = Record<string, YomiRank>;

interface ScoredQuestion {
  q: YomiQuestion;
  aiRank: YomiRank;
  aiScore: number;
  reasons: { label: string; points: number; detail: string }[];
}

const RANK_STYLE: Record<YomiRank, string> = {
  S: "bg-rose-600 text-white border-rose-600",
  A: "bg-amber-500 text-white border-amber-500",
  B: "bg-sky-500 text-white border-sky-500",
  C: "bg-gray-400 text-white border-gray-400",
};
const RANK_STYLE_OUTLINE: Record<YomiRank, string> = {
  S: "text-rose-600 border-rose-300 hover:bg-rose-50",
  A: "text-amber-600 border-amber-300 hover:bg-amber-50",
  B: "text-sky-600 border-sky-300 hover:bg-sky-50",
  C: "text-gray-500 border-gray-300 hover:bg-gray-50",
};

export default function YomiReviewPage() {
  const router = useRouter();

  // S/A 判定の問題（今回の検証対象）のみを抽出して採点
  const scored = useMemo<ScoredQuestion[]>(() => {
    return getAllYomiQuestions()
      .map((q) => {
        const s = scoreQuestion(q);
        return { q, aiRank: s.rank, aiScore: s.score, reasons: s.reasons };
      })
      .filter((x) => x.aiRank === "S" || x.aiRank === "A");
  }, []);

  const [ratings, setRatings] = useState<RatingMap>({});
  const [loaded, setLoaded] = useState(false);

  // 初期ロード（localStorage は SSR で読めないためマウント後に読む。
  // ハイドレーション不整合を避けるため初期描画は空 → 読み込み後に反映する）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 外部ストアからの初期同期（localStorage）
      if (raw) setRatings(JSON.parse(raw));
    } catch {
      /* noop */
    }
    setLoaded(true);
  }, []);

  // 保存
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
  }, [ratings, loaded]);

  function rate(id: string, rank: YomiRank) {
    setRatings((prev) => {
      if (prev[id] === rank) {
        const next = { ...prev };
        delete next[id]; // 同じものを再クリックで解除
        return next;
      }
      return { ...prev, [id]: rank };
    });
  }

  function resetAll() {
    if (confirm("人間評価をすべてリセットしますか？")) setRatings({});
  }

  // ─── 集計 ───
  const agg = useMemo(() => analyze(scored, ratings), [scored, ratings]);

  const reportText = useMemo(() => buildReport(scored, agg), [scored, agg]);

  function copyReport() {
    navigator.clipboard?.writeText(reportText).then(
      () => alert("レポートをコピーしました"),
      () => alert("コピーに失敗しました")
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            🔍 AI良問判定レビュー
          </h1>
          <p className="text-gray-500 text-sm">
            AIの S/A 判定が人間の感覚と一致するか検証する。各問に S/A/B/C を付けてください。
          </p>
          <p className="text-xs text-gray-400 mt-1">
            検証対象（AIが S/A 判定）: 全 {scored.length} 問 ／ 評価済み {agg.ratedCount} 問
          </p>
        </div>

        {/* 集計サマリー */}
        <SummaryPanel agg={agg} onCopy={copyReport} onReset={resetAll} />

        {/* 問題リスト */}
        <div className="space-y-6 mt-6">
          {scored.map(({ q, aiRank, aiScore, reasons }) => {
            const human = ratings[q.id];
            const delta = human ? RANK_NUM[aiRank] - RANK_NUM[human] : null;
            return (
              <section
                key={q.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* カードヘッダー */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-700">
                      {q.id}
                    </span>
                    <span className="text-xs text-gray-400">
                      {getYomiSourceRankLabel(q.question.source?.sourceRank)}
                    </span>
                    {/* 原本再現性バッジ（sourceValidation がある場合） */}
                    {q.question.sourceValidation && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getSourceValidationStatusClass(
                          q.question.sourceValidation.status
                        )}`}
                        title={`原本一致率 ${formatMatchRate(q.question.sourceValidation)}（${q.question.sourceValidation.matchedCount}/${q.question.sourceValidation.checkedCount}項目一致）`}
                      >
                        原本 {getSourceValidationStatusLabel(q.question.sourceValidation.status)}・
                        {formatMatchRate(q.question.sourceValidation)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full border font-bold ${RANK_STYLE[aiRank]}`}>
                      AI: {aiRank}
                    </span>
                    <span className="text-gray-500">score {aiScore}</span>
                    {delta !== null && delta !== 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          delta > 0
                            ? "bg-red-100 text-red-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {delta > 0 ? `過大評価 +${delta}` : `過小評価 ${delta}`}
                      </span>
                    )}
                    {delta === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        一致
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {/* 盤面（河・当たり牌は revealed で表示） */}
                  <YomiBoardView q={q} revealed />

                  {/* 当たり牌 */}
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-gray-500">当たり牌:</span>
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                      {q.result.hiddenTile}
                    </span>
                    <span className="text-gray-400 text-xs">
                      待ち: {q.result.waits.join("・")}（{q.result.waitShape ?? "?"}）
                    </span>
                  </div>

                  {/* AI判定理由 */}
                  <div className="mt-3 bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">
                      AI判定理由（score {aiScore} = {reasons.map((r) => `${r.label}+${r.points}`).join(", ")}）
                    </p>
                    <ul className="space-y-1">
                      {reasons.map((r, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                          <span className="font-mono text-slate-400 shrink-0">
                            +{r.points}
                          </span>
                          <span className="font-medium text-slate-700 shrink-0">
                            {r.label}
                          </span>
                          <span className="text-gray-400">— {r.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 原本差分（sourceValidation がある場合・原本とアプリ表示のズレを確認） */}
                  {q.question.sourceValidation && (
                    <div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <p className="text-xs font-semibold text-amber-700 mb-1.5">
                        原本再現性: {getSourceValidationStatusLabel(q.question.sourceValidation.status)}（一致率 {formatMatchRate(q.question.sourceValidation)} ={" "}
                        {q.question.sourceValidation.matchedCount}/{q.question.sourceValidation.checkedCount}項目）
                      </p>
                      {q.question.sourceValidation.diffSummary && q.question.sourceValidation.diffSummary.length > 0 ? (
                        <ul className="space-y-0.5">
                          {q.question.sourceValidation.diffSummary.map((d, i) => (
                            <li key={i} className="text-xs text-amber-800 flex gap-1.5">
                              <span className="text-amber-400 shrink-0">×</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-amber-700">原本と差分なし（全項目一致）。</p>
                      )}
                    </div>
                  )}

                  {/* 人間評価 */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      人間評価（あなたの感覚で良問度を採点）
                    </p>
                    <div className="flex gap-2">
                      {RANK_ORDER.map((rank) => {
                        const active = human === rank;
                        return (
                          <button
                            key={rank}
                            onClick={() => rate(q.id, rank)}
                            className={`flex-1 py-2.5 rounded-xl border-2 font-bold transition-all active:scale-95 ${
                              active ? RANK_STYLE[rank] : `bg-white ${RANK_STYLE_OUTLINE[rank]}`
                            }`}
                          >
                            {rank}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* フッター操作 */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => router.push("/yomi")}
            className="flex-1 py-3 rounded-2xl text-sm font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          >
            ← 当たり牌読みに戻る
          </button>
          <button
            onClick={copyReport}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-slate-700 text-white hover:bg-slate-800"
          >
            レポートをコピー
          </button>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────
// 集計
// ─────────────────────────────────────────────
interface DiffItem {
  id: string;
  aiRank: YomiRank;
  aiScore: number;
  humanRank: YomiRank;
  delta: number; // aiNum - humanNum（正=過大評価 / 負=過小評価）
  reasons: { label: string; points: number }[];
}

interface AggResult {
  ratedCount: number;
  total: number;
  matchCount: number;
  matchRate: number; // 0..1
  over: DiffItem[]; // 過大評価（delta>0）降順
  under: DiffItem[]; // 過小評価（delta<0）昇順
  // 過大評価に多く出現した読み要素ラベル → 重み見直し候補
  overLabelCounts: { label: string; count: number; totalPoints: number }[];
  acVsC: number; // AI:A 以上だが人間:C の件数
}

function analyze(scored: ScoredQuestion[], ratings: RatingMap): AggResult {
  const rated = scored.filter((s) => ratings[s.q.id]);
  const diffs: DiffItem[] = rated.map((s) => {
    const humanRank = ratings[s.q.id];
    return {
      id: s.q.id,
      aiRank: s.aiRank,
      aiScore: s.aiScore,
      humanRank,
      delta: RANK_NUM[s.aiRank] - RANK_NUM[humanRank],
      reasons: s.reasons.map((r) => ({ label: r.label, points: r.points })),
    };
  });

  const matchCount = diffs.filter((d) => d.delta === 0).length;
  const over = diffs.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta || b.aiScore - a.aiScore);
  const under = diffs.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta || a.aiScore - b.aiScore);

  // 過大評価された問題に出現する読み要素を集計（重み調整の手がかり）
  const labelMap = new Map<string, { count: number; totalPoints: number }>();
  for (const d of over) {
    for (const r of d.reasons) {
      const cur = labelMap.get(r.label) ?? { count: 0, totalPoints: 0 };
      cur.count += 1;
      cur.totalPoints += r.points;
      labelMap.set(r.label, cur);
    }
  }
  const overLabelCounts = Array.from(labelMap.entries())
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.count - a.count || b.totalPoints - a.totalPoints);

  const acVsC = diffs.filter((d) => d.humanRank === "C" && RANK_NUM[d.aiRank] >= RANK_NUM["A"]).length;

  return {
    ratedCount: rated.length,
    total: scored.length,
    matchCount,
    matchRate: rated.length ? matchCount / rated.length : 0,
    over,
    under,
    overLabelCounts,
    acVsC,
  };
}

// ─────────────────────────────────────────────
// サマリーパネル
// ─────────────────────────────────────────────
function SummaryPanel({
  agg,
  onCopy,
  onReset,
}: {
  agg: AggResult;
  onCopy: () => void;
  onReset: () => void;
}) {
  const pct = Math.round(agg.matchRate * 100);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">📊 集計（AI判定 vs 人間判定）</h2>
        <div className="flex gap-2">
          <button onClick={onCopy} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
            コピー
          </button>
          <button onClick={onReset} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600">
            リセット
          </button>
        </div>
      </div>

      {agg.ratedCount === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          まだ評価がありません。各問に S/A/B/C を付けると一致率が出ます。
        </p>
      ) : (
        <>
          {/* 一致率 */}
          <div className="flex items-end gap-3 mb-3">
            <div>
              <p className="text-3xl font-bold text-emerald-600">{pct}%</p>
              <p className="text-xs text-gray-400">
                一致率（{agg.matchCount}/{agg.ratedCount} 問一致）
              </p>
            </div>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {agg.acVsC > 0 && (
            <div className="mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2">
              ⚠️ <span className="font-bold">AI:A以上 × 人間:C</span> が {agg.acVsC} 件あります。
              過大評価が多いため、下記「過大評価に多い読み要素」の重みを下げる修正を検討してください。
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 過大評価トップ5 */}
            <DiffList
              title="過大評価トップ5（AI > 人間）"
              empty="過大評価なし"
              items={agg.over.slice(0, 5)}
              tone="over"
            />
            {/* 過小評価トップ5 */}
            <DiffList
              title="過小評価トップ5（AI < 人間）"
              empty="過小評価なし"
              items={agg.under.slice(0, 5)}
              tone="under"
            />
          </div>

          {/* 修正案 */}
          <div className="mt-3 bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-bold text-slate-600 mb-1.5">🔧 修正案</p>
            <ul className="space-y-1 text-xs text-gray-600 list-disc list-inside">
              {buildSuggestions(agg).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function DiffList({
  title,
  empty,
  items,
  tone,
}: {
  title: string;
  empty: string;
  items: DiffItem[];
  tone: "over" | "under";
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1.5">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((d) => (
            <li
              key={d.id}
              className="text-xs flex items-center gap-1.5 bg-white rounded-lg border border-gray-100 px-2 py-1"
            >
              <span className="font-mono font-bold text-slate-600">{d.id}</span>
              <span className="text-gray-400">
                AI:{d.aiRank}→人:{d.humanRank}
              </span>
              <span
                className={`ml-auto font-bold ${
                  tone === "over" ? "text-red-600" : "text-indigo-600"
                }`}
              >
                {d.delta > 0 ? `+${d.delta}` : d.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 集計から重み修正案を生成
function buildSuggestions(agg: AggResult): string[] {
  const out: string[] = [];
  if (agg.over.length > agg.under.length && agg.over.length > 0) {
    out.push(
      `全体に過大評価傾向（過大 ${agg.over.length} 件 > 過小 ${agg.under.length} 件）。S/A の閾値（score>=7→S / >=5→A）を1点ずつ引き上げる調整を検討。`
    );
  } else if (agg.under.length > agg.over.length && agg.under.length > 0) {
    out.push(
      `全体に過小評価傾向（過小 ${agg.under.length} 件 > 過大 ${agg.over.length} 件）。コア読み要素の配点を+1する、または閾値を下げる調整を検討。`
    );
  }
  // 過大評価に頻出する読み要素 → 重み下げ候補
  const top = agg.overLabelCounts.slice(0, 3);
  for (const t of top) {
    out.push(
      `過大評価問題に「${t.label}」が ${t.count} 回出現（加点計 +${t.totalPoints}）。この要素が単独で点を稼ぎすぎていないか、配点引き下げ or コア要素から除外を検討。`
    );
  }
  if (agg.acVsC > 0) {
    out.push(
      `AI:A以上×人間:C が ${agg.acVsC} 件。「現物/ワンチャンス/壁」など補助要素だけで A に届くケースを疑い、補助要素のみの問題はBに落とす条件を追加検討。`
    );
  }
  if (out.length === 0) {
    out.push(
      agg.ratedCount === 0
        ? "評価を入力すると修正案を表示します。"
        : "現状、大きな偏りは検出されていません。サンプル数を増やして再確認してください。"
    );
  }
  out.push("※ 配点・閾値の正本は scripts/lib/yomi-score.mjs（＋ lib/yomiScore.ts）。両方を同時に更新すること。");
  return out;
}

// コピー用プレーンテキストレポート
function buildReport(scored: ScoredQuestion[], agg: AggResult): string {
  const lines: string[] = [];
  lines.push("# AI良問判定 × 人間評価 レビュー結果");
  lines.push(`対象(AIがS/A判定): ${agg.total}問 / 評価済み: ${agg.ratedCount}問`);
  lines.push(`一致率: ${Math.round(agg.matchRate * 100)}% (${agg.matchCount}/${agg.ratedCount})`);
  lines.push(`AI:A以上×人間:C: ${agg.acVsC}件`);
  lines.push("");
  lines.push("## 過大評価トップ5 (AI > 人間)");
  if (agg.over.length === 0) lines.push("- なし");
  agg.over.slice(0, 5).forEach((d) =>
    lines.push(`- ${d.id}: AI ${d.aiRank}(score ${d.aiScore}) → 人間 ${d.humanRank} (+${d.delta})`)
  );
  lines.push("");
  lines.push("## 過小評価トップ5 (AI < 人間)");
  if (agg.under.length === 0) lines.push("- なし");
  agg.under.slice(0, 5).forEach((d) =>
    lines.push(`- ${d.id}: AI ${d.aiRank}(score ${d.aiScore}) → 人間 ${d.humanRank} (${d.delta})`)
  );
  lines.push("");
  lines.push("## 修正案");
  buildSuggestions(agg).forEach((s) => lines.push(`- ${s}`));
  return lines.join("\n");
}
