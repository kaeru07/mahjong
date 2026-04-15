"use client";

import { useState } from "react";
import { Question } from "@/types/question";
import { validateJsonString } from "@/lib/questionValidate";
import QuestionPreview from "./QuestionPreview";

const PLACEHOLDER = `{
  "id": "q100",
  "title": "問題タイトル",
  "question": "何を切る？",
  "choices": [
    { "key": "A", "label": "5筒" },
    { "key": "B", "label": "8萬" }
  ],
  "answer": "A",
  "explanation": "5筒が安全。",
  "tags": ["安全牌"],
  "difficulty": "medium"
}`;

interface Props {
  onAdd: (q: Question) => void;
  existingCandidateIds: string[];
}

export default function ImportJsonPanel({ onAdd, existingCandidateIds }: Props) {
  const [jsonText, setJsonText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Question | null>(null);
  const [added, setAdded] = useState(false);

  function handleValidate() {
    setAdded(false);
    const result = validateJsonString(jsonText, { checkDuplicate: true });
    if (!result.valid) {
      setErrors(result.errors);
      setPreview(null);
      return;
    }
    const normalized = result.normalized!;
    // 追加候補内の重複チェック
    if (existingCandidateIds.includes(normalized.id)) {
      setErrors([`id "${normalized.id}" は既に追加候補に含まれています`]);
      setPreview(null);
      return;
    }
    setErrors([]);
    setPreview(normalized);
  }

  function handleAdd() {
    if (!preview) return;
    onAdd(preview);
    setAdded(true);
    setPreview(null);
    setJsonText("");
    setErrors([]);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        questions.json 形式のJSONを1問分貼り付けてください。
      </p>

      <textarea
        className="w-full h-56 font-mono text-xs border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        placeholder={PLACEHOLDER}
        value={jsonText}
        onChange={(e) => {
          setJsonText(e.target.value);
          setErrors([]);
          setPreview(null);
          setAdded(false);
        }}
      />

      <button
        onClick={handleValidate}
        disabled={jsonText.trim() === ""}
        className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        検証する
      </button>

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-600 mb-2">
            {errors.length} 件のエラーがあります
          </p>
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-sm text-red-700 flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 追加成功メッセージ */}
      {added && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          追加候補に追加しました
        </div>
      )}

      {/* プレビュー */}
      {preview && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-600">プレビュー</p>
          <QuestionPreview question={preview} />
          <button
            onClick={handleAdd}
            className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all"
          >
            追加候補に追加する
          </button>
        </div>
      )}
    </div>
  );
}
