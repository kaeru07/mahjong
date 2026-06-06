"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAllYomiQuestions,
  filterYomiQuestions,
  getAllYomiTags,
  getAllYomiDifficulties,
  pickYomiQuestions,
  getDifficultyLabel,
} from "@/lib/yomi";

const COUNT_OPTIONS = [5, 10, 0]; // 0 = すべて

export default function YomiHome() {
  const router = useRouter();
  const all = useMemo(() => getAllYomiQuestions(), []);
  const allTags = useMemo(() => getAllYomiTags(all), [all]);
  const allDifficulties = useMemo(() => getAllYomiDifficulties(all), [all]);

  const [difficulty, setDifficulty] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [count, setCount] = useState(10);

  const filtered = useMemo(
    () => filterYomiQuestions(all, selectedTags, difficulty),
    [all, selectedTags, difficulty]
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function start() {
    if (filtered.length === 0) return;
    const qs = pickYomiQuestions(filtered, count);
    sessionStorage.setItem("yomiQuestions", JSON.stringify(qs));
    sessionStorage.setItem("yomiAnswers", JSON.stringify([]));
    router.push("/yomi/quiz?index=0");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-emerald-800 mb-1">🀄 当たり牌読み練習</h1>
          <p className="text-gray-500 text-sm">捨て牌・手出し・リーチから当たり牌を読む</p>
          <p className="text-xs text-gray-400 mt-1">全 {all.length} 問</p>
        </div>

        {/* 難易度 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">難易度</h2>
          <div className="flex flex-wrap gap-2">
            {["all", ...allDifficulties].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  difficulty === d
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"
                }`}
              >
                {d === "all" ? "すべて" : getDifficultyLabel(d)}
              </button>
            ))}
          </div>
        </section>

        {/* タグ */}
        {allTags.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">
              タグで絞り込み
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="ml-2 text-xs text-emerald-500 underline font-normal"
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

        {/* 問題数 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">問題数</h2>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  count === c
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"
                }`}
              >
                {c === 0 ? "すべて" : `${c}問`}
              </button>
            ))}
          </div>
        </section>

        {/* 開始 */}
        <div className="text-center">
          {filtered.length > 0 ? (
            <p className="text-sm text-gray-500 mb-3">
              対象問題: <span className="font-bold text-emerald-700">{filtered.length}</span> 問
              {count > 0 && filtered.length > count && `（${count}問を出題）`}
            </p>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
              条件に合う問題がありません
            </p>
          )}
          <button
            onClick={start}
            disabled={filtered.length === 0}
            className="w-full py-4 rounded-2xl text-lg font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            当たり牌読み練習を始める
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full mt-3 py-2.5 rounded-2xl text-sm font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
          >
            ← 何切る問題に戻る
          </button>
        </div>
      </div>
    </main>
  );
}
