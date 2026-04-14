"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Question } from "@/types/question";
import { getChoiceLabel } from "@/lib/quiz";
import BoardView from "@/components/BoardView";

function QuizContent() {
  const router = useRouter();
  const params = useSearchParams();
  const index = parseInt(params.get("index") ?? "0", 10);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const qs = sessionStorage.getItem("quizQuestions");
    const ans = sessionStorage.getItem("quizAnswers");
    if (!qs) { router.push("/"); return; }
    setQuestions(JSON.parse(qs));
    setAnswers(ans ? JSON.parse(ans) : []);
  }, [router]);

  // index が変わったら選択状態をリセット
  useEffect(() => {
    setSelected(null);
    setRevealed(false);
  }, [index]);

  const q = questions[index];

  function choose(key: string) {
    if (revealed) return;
    setSelected(key);
    setRevealed(true);
  }

  function next() {
    const newAnswers = [...answers];
    newAnswers[index] = selected ?? "";
    sessionStorage.setItem("quizAnswers", JSON.stringify(newAnswers));

    if (index + 1 < questions.length) {
      router.push(`/quiz?index=${index + 1}`);
    } else {
      router.push("/result");
    }
  }

  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  const isCorrect = selected === q.answer;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* プログレス */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← ホーム
          </button>
          <div className="flex-1 bg-gray-200 rounded-full h-1.5 ml-2">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {index + 1} / {questions.length}
          </span>
        </div>

        {/* タイトル */}
        <h1 className="text-lg font-bold text-gray-800 mb-3">{q.title}</h1>

        {/* 麻雀盤面 */}
        <BoardView q={q} />

        {/* 問題文 */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
          <p className="text-gray-800 font-medium">{q.question}</p>
          {q.difficulty && (
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
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

        {/* 選択肢 */}
        <div className="space-y-2 mb-4">
          {q.choices.map((choice) => {
            let style =
              "w-full text-left px-4 py-3 rounded-xl border font-medium transition-all ";
            if (!revealed) {
              style += "bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 active:scale-95";
            } else if (choice.key === q.answer) {
              style += "bg-green-100 border-green-500 text-green-800";
            } else if (choice.key === selected && choice.key !== q.answer) {
              style += "bg-red-100 border-red-400 text-red-700";
            } else {
              style += "bg-white border-gray-200 text-gray-400";
            }

            return (
              <button key={choice.key} onClick={() => choose(choice.key)} className={style}>
                <span className="text-gray-400 mr-2">{choice.key}.</span>
                {choice.label}
                {revealed && choice.key === q.answer && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
                {revealed && choice.key === selected && choice.key !== q.answer && (
                  <span className="ml-2 text-red-500">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 回答後: 解説 + 次へ */}
        {revealed && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div
              className={`rounded-xl p-4 mb-4 border ${
                isCorrect
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className={`font-bold mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                {isCorrect
                  ? "正解！"
                  : `不正解（正解: ${q.answer}. ${getChoiceLabel(q, q.answer)}）`}
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">{q.explanation}</p>
            </div>

            {/* タグ */}
            {q.tags && q.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {q.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={next}
              className="w-full py-3 rounded-2xl font-bold bg-indigo-600 text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
            >
              {index + 1 < questions.length ? "次の問題へ →" : "結果を見る"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>}>
      <QuizContent />
    </Suspense>
  );
}
