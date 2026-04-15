"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Question } from "@/types/question";
import {
  filterQuestions,
  getDifficultyLabel,
  getAllTags,
  getAllDifficulties,
} from "@/lib/quiz";
import { getImportedQuestions } from "@/lib/questionStore";

interface HomeContentProps {
  allQuestions: Question[];
  allTags: string[];
  allDifficulties: (Question["difficulty"])[];
}

export default function HomeContent({
  allQuestions,
}: HomeContentProps) {
  const router = useRouter();
  const params = useSearchParams();

  // base（JSON）+ localStorage追加分をマージ
  const [mergedQuestions, setMergedQuestions] = useState<Question[]>(allQuestions);

  useEffect(() => {
    const imported = getImportedQuestions();
    if (imported.length === 0) return;
    const baseIds = new Set(allQuestions.map((q) => q.id));
    const unique = imported.filter((q) => !baseIds.has(q.id));
    setMergedQuestions([...allQuestions, ...unique]);
  }, [allQuestions]);

  // マージ後のデータからタグ・難易度を導出
  const allTags = useMemo(() => getAllTags(mergedQuestions), [mergedQuestions]);
  const allDifficulties = useMemo(
    () => getAllDifficulties(mergedQuestions),
    [mergedQuestions]
  );

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const t = params.get("tags");
    return t ? t.split(",").filter(Boolean) : [];
  });
  const [difficulty, setDifficulty] = useState<string>(
    () => params.get("difficulty") ?? "all"
  );

  const filtered = useMemo(
    () => filterQuestions(mergedQuestions, selectedTags, difficulty),
    [mergedQuestions, selectedTags, difficulty]
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function startQuiz() {
    if (filtered.length === 0) return;
    // 固定10問制限を廃止 — 絞り込み結果をすべてランダム順で出題
    const quizQuestions = [...filtered].sort(() => Math.random() - 0.5);
    sessionStorage.setItem("quizQuestions", JSON.stringify(quizQuestions));
    sessionStorage.setItem("quizAnswers", JSON.stringify([]));
    router.push("/quiz?index=0");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-800 mb-1">🀄 麻雀問題</h1>
          <p className="text-gray-500 text-sm">実戦力を鍛えよう</p>
          <p className="text-xs text-gray-400 mt-1">全 {mergedQuestions.length} 問</p>
        </div>

        {/* 難易度 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">難易度</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDifficulty("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                difficulty === "all"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
              }`}
            >
              すべて
            </button>
            {allDifficulties.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d!)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  difficulty === d
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {getDifficultyLabel(d)}
              </button>
            ))}
          </div>
        </section>

        {/* タグ絞り込み */}
        {allTags.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">
              タグ絞り込み
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="ml-2 text-xs text-indigo-500 underline font-normal"
                >
                  クリア
                </button>
              )}
            </h2>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 問題数 + 開始ボタン */}
        <div className="text-center">
          {filtered.length > 0 ? (
            <p className="text-sm text-gray-500 mb-3">
              対象問題:{" "}
              <span className="font-bold text-indigo-700">{filtered.length}</span> 問
            </p>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
              条件に合う問題がありません
            </p>
          )}
          <button
            onClick={startQuiz}
            disabled={filtered.length === 0}
            className="w-full py-4 rounded-2xl text-lg font-bold bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ランダムに始める
          </button>
          <button
            onClick={() => router.push("/questions")}
            className="w-full mt-3 py-3 rounded-2xl text-sm font-bold bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 active:scale-95 transition-all"
          >
            問題一覧を見る
          </button>
          <button
            onClick={() => router.push("/import")}
            className="w-full mt-3 py-2.5 rounded-2xl text-sm font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
          >
            問題を取り込む
          </button>
        </div>
      </div>
    </main>
  );
}
