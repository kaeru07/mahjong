"use client";

import { Question } from "@/types/question";
import { getDifficultyLabel, getDifficultyClass } from "@/lib/quiz";

interface Props {
  question: Question;
  onRemove?: () => void;
  index?: number;
}

export default function QuestionPreview({ question: q, onRemove, index }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      {/* ヘッダー行 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {index !== undefined && (
            <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
          )}
          <span className="text-xs font-mono text-gray-400">{q.id}</span>
          {q.difficulty && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyClass(q.difficulty)}`}
            >
              {getDifficultyLabel(q.difficulty)}
            </span>
          )}
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
          >
            削除
          </button>
        )}
      </div>

      {/* タイトル */}
      <p className="font-semibold text-gray-800 mb-1">{q.title}</p>

      {/* 問題文 */}
      <p className="text-sm text-gray-600 mb-3">{q.question}</p>

      {/* 選択肢 */}
      <div className="space-y-1 mb-3">
        {q.choices.map((c) => (
          <div
            key={c.key}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              c.key === q.answer
                ? "bg-green-50 border-green-300 text-green-800 font-medium"
                : "bg-gray-50 border-gray-200 text-gray-600"
            }`}
          >
            <span className="mr-2 font-mono">{c.key}.</span>
            {c.label}
            {c.key === q.answer && (
              <span className="ml-1 text-green-600 text-xs">✓ 正解</span>
            )}
          </div>
        ))}
      </div>

      {/* 解説 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-2">
        <p className="text-xs font-semibold text-indigo-600 mb-0.5">解説</p>
        <p className="text-sm text-gray-700">{q.explanation}</p>
      </div>

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
  );
}
