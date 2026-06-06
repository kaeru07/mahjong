"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { YomiQuestion } from "@/types/yomi";
import { calcYomiScore, getDifficultyLabel, getDifficultyClass } from "@/lib/yomi";
import TileDisplay from "@/components/TileDisplay";

export default function YomiResultPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<YomiQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

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

  if (questions.length === 0) return null;

  const score = calcYomiScore(answers, questions);
  const total = questions.length;
  const pct = Math.round((score / total) * 100);

  const rankMsg =
    pct === 100 ? "完璧！読みが冴えている" :
    pct >= 80 ? "優秀！放銃を大きく減らせる" :
    pct >= 60 ? "good！スジ・壁の精度を上げよう" :
    pct >= 40 ? "もう一歩。河の手出しに注目" :
    "基礎から。まずはリーチ宣言牌の周辺を読もう";

  const rankColor = pct >= 80 ? "text-green-700" : pct >= 60 ? "text-yellow-700" : "text-red-600";

  // 復習モード: 間違えた問題だけ再出題
  function reviewWrong() {
    const wrong = questions.filter((q, i) => answers[i] !== q.question.correctTile);
    if (wrong.length === 0) return;
    sessionStorage.setItem("yomiQuestions", JSON.stringify(wrong));
    sessionStorage.setItem("yomiAnswers", JSON.stringify([]));
    router.push("/yomi/quiz?index=0");
  }

  function retry() {
    sessionStorage.setItem("yomiAnswers", JSON.stringify([]));
    router.push("/yomi/quiz?index=0");
  }

  const wrongCount = total - score;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-center text-emerald-800 mb-6">当たり牌読み 結果</h1>

        {/* スコア */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow p-6 text-center mb-6">
          <p className={`text-5xl font-extrabold mb-1 ${rankColor}`}>{pct}%</p>
          <p className="text-lg text-gray-600 mb-1">
            {total} 問中 <span className="font-bold text-gray-800">{score}</span> 問正解
          </p>
          <p className="text-xs text-gray-400 mb-3">的中 {score} 問 ／ 放銃読み外し {wrongCount} 問</p>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`text-sm font-medium ${rankColor}`}>{rankMsg}</p>
        </div>

        {/* 問題別 */}
        <div className="space-y-2 mb-6">
          {questions.map((q, i) => {
            const ok = answers[i] === q.question.correctTile;
            return (
              <div
                key={q.id}
                className={`flex items-start gap-3 rounded-xl p-3 border ${ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              >
                <span className={`text-lg mt-0.5 ${ok ? "text-green-500" : "text-red-400"}`}>{ok ? "✓" : "✗"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">第{i + 1}問</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getDifficultyClass(q.question.difficulty)}`}>
                      {getDifficultyLabel(q.question.difficulty)}
                    </span>
                    <span className="text-xs text-gray-400">{q.result.waitShape}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>正解</span>
                    <TileDisplay tile={q.question.correctTile} tileSize={18} />
                    {!ok && (
                      <>
                        <span className="text-gray-300">/</span>
                        <span>あなた</span>
                        {answers[i] ? <TileDisplay tile={answers[i]} tileSize={18} /> : <span className="text-red-400">未回答</span>}
                      </>
                    )}
                  </div>
                  {q.question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.question.tags.map((t) => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ボタン */}
        <div className="space-y-3">
          {wrongCount > 0 && (
            <button
              onClick={reviewWrong}
              className="w-full py-3 rounded-2xl font-bold bg-amber-500 text-white shadow hover:bg-amber-600 active:scale-95 transition-all"
            >
              復習モード（間違えた {wrongCount} 問だけ）
            </button>
          )}
          <button
            onClick={retry}
            className="w-full py-3 rounded-2xl font-bold bg-emerald-600 text-white shadow hover:bg-emerald-700 active:scale-95 transition-all"
          >
            もう一度（同じ問題）
          </button>
          <button
            onClick={() => router.push("/yomi")}
            className="w-full py-3 rounded-2xl font-bold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-all"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
