"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/question";
import { getAllQuestions, getDifficultyLabel, getDifficultyClass, getAllTags } from "@/lib/quiz";
import { getImportedQuestions } from "@/lib/questionStore";

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string>("");

  useEffect(() => {
    const base = getAllQuestions();
    const imported = getImportedQuestions();
    const baseIds = new Set(base.map((q) => q.id));
    const unique = imported.filter((q) => !baseIds.has(q.id));
    setQuestions([...base, ...unique]);
  }, []);

  const allTags = useMemo(() => getAllTags(questions), [questions]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterTag && (!q.tags || !q.tags.includes(filterTag))) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        return (
          q.title.toLowerCase().includes(s) ||
          q.question.toLowerCase().includes(s) ||
          q.id.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [questions, search, filterTag]);

  function startSingle(q: Question) {
    sessionStorage.setItem("quizQuestions", JSON.stringify([q]));
    sessionStorage.setItem("quizAnswers", JSON.stringify([]));
    router.push("/quiz?index=0");
  }

  function startAll() {
    if (filtered.length === 0) return;
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    sessionStorage.setItem("quizQuestions", JSON.stringify(shuffled));
    sessionStorage.setItem("quizAnswers", JSON.stringify([]));
    router.push("/quiz?index=0");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0"
          >
            ← ホーム
          </button>
          <h1 className="text-xl font-bold text-indigo-800">
            問題一覧
            <span className="ml-2 text-sm font-normal text-gray-400">
              全 {questions.length} 問
            </span>
          </h1>
        </div>

        {/* 検索 */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・問題文・IDで検索"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* タグフィルター */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilterTag("")}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                filterTag === ""
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
              }`}
            >
              すべて
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  filterTag === tag
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* まとめて解くボタン */}
        {filtered.length > 0 && (
          <button
            onClick={startAll}
            className="w-full mb-5 py-3 rounded-2xl text-sm font-bold bg-indigo-600 text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
          >
            絞り込み結果 {filtered.length} 問をランダムに解く
          </button>
        )}

        {/* 問題リスト */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">
            該当する問題がありません
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((q) => (
              <div
                key={q.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* ID + 難易度 */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono">{q.id}</span>
                      {q.difficulty && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getDifficultyClass(
                            q.difficulty
                          )}`}
                        >
                          {getDifficultyLabel(q.difficulty)}
                        </span>
                      )}
                    </div>
                    {/* タイトル */}
                    <p className="text-sm font-semibold text-gray-800 mb-1 leading-snug">
                      {q.title}
                    </p>
                    {/* 問題文冒頭 */}
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {q.question}
                    </p>
                    {/* タグ */}
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
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
                  </div>
                  {/* 解くボタン */}
                  <button
                    onClick={() => startSingle(q)}
                    className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all whitespace-nowrap"
                  >
                    解く
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
