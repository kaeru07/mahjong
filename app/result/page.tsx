"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/question";
import { calcScore, getChoiceLabel } from "@/lib/quiz";

export default function ResultPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    const qs = sessionStorage.getItem("quizQuestions");
    const ans = sessionStorage.getItem("quizAnswers");
    if (!qs) { router.push("/"); return; }
    setQuestions(JSON.parse(qs));
    setAnswers(ans ? JSON.parse(ans) : []);
  }, [router]);

  if (questions.length === 0) return null;

  const score = calcScore(answers, questions);
  const total = questions.length;
  const pct = Math.round((score / total) * 100);

  const rankMsg =
    pct === 100 ? "パーフェクト！素晴らしい！" :
    pct >= 80   ? "優秀！もう少しで完璧！" :
    pct >= 60   ? "なかなか！まだ伸びしろあり" :
    pct >= 40   ? "まだまだ修行が必要！" :
                  "基礎から見直そう！";

  const rankColor =
    pct >= 80 ? "text-green-700" :
    pct >= 60 ? "text-yellow-700" :
                "text-red-600";

  function retry() {
    sessionStorage.setItem("quizAnswers", JSON.stringify([]));
    router.push("/quiz?index=0");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-center text-indigo-800 mb-6">結果発表</h1>

        {/* スコアカード */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow p-6 text-center mb-6">
          <p className={`text-5xl font-extrabold mb-1 ${rankColor}`}>{pct}%</p>
          <p className="text-lg text-gray-600 mb-1">
            {total} 問中 <span className="font-bold text-gray-800">{score}</span> 問正解
          </p>
          <p className="text-xs text-gray-400 mb-3">
            正解 {score} 問 ／ 不正解 {total - score} 問
          </p>
          {/* 正答率バー */}
          <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`text-sm font-medium ${rankColor}`}>{rankMsg}</p>
        </div>

        {/* 問題別結果 */}
        <div className="space-y-2 mb-6">
          {questions.map((q, i) => {
            const correct = answers[i] === q.answer;
            return (
              <div
                key={q.id}
                className={`flex items-start gap-3 rounded-xl p-3 border ${
                  correct ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <span className={`text-lg mt-0.5 ${correct ? "text-green-500" : "text-red-400"}`}>
                  {correct ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 truncate">{q.title}</p>
                    {q.difficulty && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        q.difficulty === "easy"
                          ? "bg-green-100 text-green-700"
                          : q.difficulty === "medium" || q.difficulty === "normal"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {q.difficulty === "easy" ? "易"
                          : q.difficulty === "medium" || q.difficulty === "normal" ? "普通"
                          : "難"}
                      </span>
                    )}
                  </div>
                  {!correct && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      あなた:{" "}
                      <span className="text-red-500">
                        {answers[i]
                          ? `${answers[i]}. ${getChoiceLabel(q, answers[i])}`
                          : "未回答"}
                      </span>
                      　正解:{" "}
                      <span className="text-green-600">
                        {q.answer}. {getChoiceLabel(q, q.answer)}
                      </span>
                    </p>
                  )}
                  {q.tags && q.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.tags.map((t) => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">
                          {t}
                        </span>
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
          <button
            onClick={retry}
            className="w-full py-3 rounded-2xl font-bold bg-indigo-600 text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
          >
            もう一度挑戦
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-2xl font-bold bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </main>
  );
}
