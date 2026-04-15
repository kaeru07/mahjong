"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/question";
import { getAllQuestions } from "@/lib/quiz";
import {
  getImportedQuestions,
  addImportedQuestions,
  removeImportedQuestion,
  clearImportedQuestions,
} from "@/lib/questionStore";
import ImportJsonPanel from "@/components/ImportJsonPanel";
import ImportTextPanel from "@/components/ImportTextPanel";
import QuestionPreview from "@/components/QuestionPreview";

type Tab = "json" | "text";

export default function ImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("json");
  const [added, setAdded] = useState<Question[]>([]);

  const baseQuestions = getAllQuestions();
  const baseIds = new Set(baseQuestions.map((q) => q.id));

  // localStorageから既存の追加済み問題を読み込む
  useEffect(() => {
    setAdded(getImportedQuestions());
  }, []);

  const totalCount = baseQuestions.length + added.length;
  const addedIds = added.map((q) => q.id);

  function handleAdd(qs: Question[]) {
    addImportedQuestions(qs, baseIds);
    setAdded(getImportedQuestions());
  }

  function handleRemove(id: string) {
    removeImportedQuestion(id);
    setAdded((prev) => prev.filter((q) => q.id !== id));
  }

  function handleClearAll() {
    clearImportedQuestions();
    setAdded([]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← ホーム
          </button>
          <h1 className="text-xl font-bold text-indigo-800">問題取り込み</h1>
        </div>

        {/* 問題数 */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-gray-500">総問題数</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-700">{totalCount} 問</span>
            {added.length > 0 && (
              <span className="text-xs text-emerald-600 font-medium">
                (+{added.length} 追加済み)
              </span>
            )}
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {(
            [
              { key: "json", label: "JSON貼り付け" },
              { key: "text", label: "テキスト変換" },
            ] as { key: Tab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* パネル */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 shadow-sm">
          {tab === "json" ? (
            <ImportJsonPanel onAdd={handleAdd} addedIds={addedIds} />
          ) : (
            <ImportTextPanel
              onAdd={(q) => handleAdd([q])}
              addedIds={addedIds}
            />
          )}
        </div>

        {/* 追加済みリスト */}
        {added.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                追加済み（{added.length} 問）
              </h2>
              <button
                onClick={handleClearAll}
                className="text-xs text-red-400 hover:text-red-600"
              >
                全削除
              </button>
            </div>

            <div className="space-y-3">
              {added.map((q, i) => (
                <QuestionPreview
                  key={q.id}
                  question={q}
                  index={i}
                  onRemove={() => handleRemove(q.id)}
                />
              ))}
            </div>
          </section>
        )}

        {added.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            上のフォームから問題を追加してください
          </div>
        )}
      </div>
    </main>
  );
}
