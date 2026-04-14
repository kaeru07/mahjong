"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllQuestions, filterQuestions, getAllTags } from "@/lib/quiz";

const allQuestions = getAllQuestions();
const allTagsStatic = getAllTags(allQuestions);

function HomeContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const t = params.get("tags");
    return t ? t.split(",").filter(Boolean) : [];
  });
  const [difficulty, setDifficulty] = useState<string>(
    () => params.get("difficulty") ?? "all"
  );

  const filtered = useMemo(
    () => filterQuestions(allQuestions, selectedTags, difficulty),
    [selectedTags, difficulty]
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function startQuiz() {
    if (filtered.length === 0) return;
    const quizQuestions =
      filtered.length > 10
        ? [...filtered].sort(() => Math.random() - 0.5).slice(0, 10)
        : filtered;
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
        </div>

        {/* 難易度 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">難易度</h2>
          <div className="flex flex-wrap gap-2">
            {(["all", "easy", "medium", "normal", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  difficulty === d
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {d === "all" ? "すべて"
                  : d === "easy" ? "易"
                  : d === "medium" || d === "normal" ? "普通"
                  : "難"}
              </button>
            ))}
          </div>
        </section>

        {/* タグ絞り込み */}
        {allTagsStatic.length > 0 && (
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
              {allTagsStatic.map((tag) => (
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
          <p className="text-sm text-gray-500 mb-3">
            対象問題:{" "}
            <span className="font-bold text-indigo-700">{filtered.length}</span> 問
            {filtered.length > 10 && (
              <span className="ml-1 text-xs text-gray-400">（最大10問をランダム出題）</span>
            )}
          </p>
          <button
            onClick={startQuiz}
            disabled={filtered.length === 0}
            className="w-full py-4 rounded-2xl text-lg font-bold bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            問題を開始する
          </button>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
