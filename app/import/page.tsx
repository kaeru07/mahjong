"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/question";
import { getAllQuestions } from "@/lib/quiz";
import { downloadJson, mergeWithExisting } from "@/lib/questionImport";
import ImportJsonPanel from "@/components/ImportJsonPanel";
import ImportTextPanel from "@/components/ImportTextPanel";
import QuestionPreview from "@/components/QuestionPreview";

type Tab = "json" | "text";

export default function ImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("json");
  const [candidates, setCandidates] = useState<Question[]>([]);

  const existingCount = getAllQuestions().length;
  const candidateIds = candidates.map((q) => q.id);

  function addCandidate(q: Question) {
    setCandidates((prev) => [...prev, q]);
  }

  function removeCandidate(id: string) {
    setCandidates((prev) => prev.filter((q) => q.id !== id));
  }

  function downloadSingle(q: Question) {
    downloadJson(q, `question-${q.id}.json`);
  }

  function downloadAllCandidates() {
    downloadJson(candidates, "questions-new.json");
  }

  function downloadMerged() {
    const merged = mergeWithExisting(candidates);
    downloadJson(merged, "merged-questions.json");
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

        {/* 現在の問題数 */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm text-gray-500">現在の総問題数</span>
          <span className="font-bold text-indigo-700">{existingCount} 問</span>
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
            <ImportJsonPanel
              onAdd={addCandidate}
              existingCandidateIds={candidateIds}
            />
          ) : (
            <ImportTextPanel
              onAdd={addCandidate}
              existingCandidateIds={candidateIds}
            />
          )}
        </div>

        {/* 追加候補リスト */}
        {candidates.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                追加候補 ({candidates.length} 問)
              </h2>
              <button
                onClick={() => setCandidates([])}
                className="text-xs text-red-400 hover:text-red-600"
              >
                全削除
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {candidates.map((q, i) => (
                <div key={q.id}>
                  <QuestionPreview
                    question={q}
                    index={i}
                    onRemove={() => removeCandidate(q.id)}
                  />
                  <button
                    onClick={() => downloadSingle(q)}
                    className="mt-1 w-full py-1.5 text-xs rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    この問題だけダウンロード (question-{q.id}.json)
                  </button>
                </div>
              ))}
            </div>

            {/* ダウンロードボタン群 */}
            <div className="space-y-3">
              <button
                onClick={downloadAllCandidates}
                className="w-full py-3 rounded-2xl font-bold bg-indigo-600 text-white shadow hover:bg-indigo-700 active:scale-95 transition-all"
              >
                追加候補をまとめてダウンロード (questions-new.json)
              </button>
              <button
                onClick={downloadMerged}
                className="w-full py-3 rounded-2xl font-bold bg-emerald-600 text-white shadow hover:bg-emerald-700 active:scale-95 transition-all"
              >
                既存とマージしてダウンロード (merged-questions.json)
              </button>
              <p className="text-xs text-gray-400 text-center">
                ダウンロード後、merged-questions.json を data/questions.json に置き換えると反映されます
              </p>
            </div>
          </section>
        )}

        {candidates.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            上のフォームから問題を追加候補に入れてください
          </div>
        )}
      </div>
    </main>
  );
}
