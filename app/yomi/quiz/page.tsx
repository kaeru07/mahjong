"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { YomiQuestion } from "@/types/yomi";
import { getDifficultyLabel, getDifficultyClass, SEAT_LABEL } from "@/lib/yomi";
import YomiBoardView from "@/components/YomiBoardView";
import TileDisplay from "@/components/TileDisplay";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
  );
}

function QuizContent() {
  const router = useRouter();
  const params = useSearchParams();
  const index = parseInt(params.get("index") ?? "0", 10);

  const [questions, setQuestions] = useState<YomiQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const qs = sessionStorage.getItem("yomiQuestions");
    const ans = sessionStorage.getItem("yomiAnswers");
    if (!qs) {
      router.push("/yomi");
      return;
    }
    setQuestions(JSON.parse(qs));
    setAnswers(ans ? JSON.parse(ans) : []);
  }, [router]);

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
  }, [index]);

  const q = questions[index];
  if (!q) return <Loading />;

  const body = q.question;
  const correct = body.correctTile;
  const isCorrect = selected === correct;

  function choose(tile: string) {
    if (revealed) return;
    setSelected(tile);
    setRevealed(true);
  }

  function next() {
    const na = [...answers];
    na[index] = selected ?? "";
    sessionStorage.setItem("yomiAnswers", JSON.stringify(na));
    if (index + 1 < questions.length) {
      router.push(`/yomi/quiz?index=${index + 1}`);
    } else {
      router.push("/yomi/result");
    }
  }

  const winnerLabel = SEAT_LABEL[q.result.winner];
  const loserLabel = q.result.loser ? SEAT_LABEL[q.result.loser] : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* プログレス */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => router.push("/yomi")} className="text-gray-400 hover:text-gray-600 text-sm">
            ← ホーム
          </button>
          <div className="flex-1 bg-gray-200 rounded-full h-1.5 ml-2">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {index + 1} / {questions.length}
          </span>
        </div>

        {/* 盤面 */}
        <YomiBoardView q={q} revealed={revealed} />

        {/* 設問 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
          <p className="text-gray-800 font-medium">{body.text}</p>
          <span
            className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyClass(
              body.difficulty
            )}`}
          >
            {getDifficultyLabel(body.difficulty)}
          </span>
        </div>

        {/* 選択肢（牌） */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {body.choices.map((tile) => {
            let style =
              "flex flex-col items-center justify-center gap-1 py-2 rounded-xl border font-medium transition-all ";
            if (!revealed) {
              style += "bg-white border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 active:scale-95";
            } else if (tile === correct) {
              style += "bg-green-100 border-green-500";
            } else if (tile === selected) {
              style += "bg-red-100 border-red-400";
            } else {
              style += "bg-white border-gray-200 opacity-50";
            }
            return (
              <button key={tile} onClick={() => choose(tile)} className={style}>
                <TileDisplay tile={tile} tileSize={30} />
                {revealed && tile === correct && <span className="text-[10px] text-green-600">正解</span>}
                {revealed && tile === selected && tile !== correct && (
                  <span className="text-[10px] text-red-500">あなた</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 回答後: 読み筋・解説 */}
        {revealed && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
            {/* 正誤 */}
            <div className={`rounded-xl p-4 border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className={`font-bold ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                {isCorrect ? "正解！" : `不正解（正解: ${correct}）`}
              </p>
            </div>

            {/* 結果サマリー */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-700 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">正解牌</span>
                <TileDisplay tile={correct} tileSize={24} />
                <span className="font-bold">{correct}</span>
              </div>
              <Row label="和了" value={`${q.result.type === "ron" ? "ロン" : "ツモ"}　和了者: ${winnerLabel}${loserLabel ? `／放銃者: ${loserLabel}` : ""}`} />
              <Row label="待ち形" value={`${q.result.waitShape ?? "-"}（待ち: ${q.result.waits.join("・")}）`} />
              <Row label="役" value={q.result.yaku.join("・")} />
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">危険度</span>
                <span className="text-amber-500 tracking-wide text-base leading-none">
                  {"★".repeat(body.dangerLevel)}<span className="text-gray-200">{"★".repeat(5 - body.dangerLevel)}</span>
                </span>
                <span className="text-xs text-gray-400">{body.dangerLevel} / 5</span>
              </div>
            </div>

            {/* 読み根拠 */}
            {body.readingBasis && body.readingBasis.length > 0 && (
              <div className="bg-sky-50 rounded-xl border border-sky-200 p-4">
                <p className="text-sm font-bold text-sky-800 mb-2">🧭 読み根拠</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  {body.readingBasis.map((rb, i) => (
                    <li key={i} className="flex flex-col gap-0.5">
                      <span className="inline-flex w-fit items-center text-xs font-bold text-sky-700 bg-sky-100 rounded-full px-2 py-0.5">
                        {rb.label}
                      </span>
                      <span className="leading-relaxed">{rb.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 読み筋 */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <p className="text-sm font-bold text-emerald-800 mb-2">📖 読み筋</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                {body.readingPoints.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* なぜ危険だったか */}
            {body.dangerReason && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <p className="text-sm font-bold text-amber-800 mb-1">⚠ なぜその牌が危険だったか</p>
                <p className="text-sm text-gray-700 leading-relaxed">{body.dangerReason}</p>
              </div>
            )}

            {/* 解説 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-bold text-gray-700 mb-1">解説</p>
              <p className="text-sm text-gray-700 leading-relaxed">{body.explanation}</p>
            </div>

            {/* 他の選択肢がなぜ違うか */}
            {body.choiceReasons && body.choiceReasons.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-bold text-gray-700 mb-2">他の選択肢がなぜ違うか</p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  {body.choiceReasons.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex-shrink-0 mt-0.5">
                        <TileDisplay tile={c.tile} tileSize={20} />
                      </span>
                      <span>{c.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* タグ */}
            {body.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {body.tags.map((t) => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={next}
              className="w-full py-3 rounded-2xl font-bold bg-emerald-600 text-white shadow hover:bg-emerald-700 active:scale-95 transition-all"
            >
              {index + 1 < questions.length ? "次の問題へ →" : "結果を見る"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 w-16 flex-shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function YomiQuizPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QuizContent />
    </Suspense>
  );
}
