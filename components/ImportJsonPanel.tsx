"use client";

import { useState } from "react";
import { Question } from "@/types/question";
import { validateJsonStringBatch } from "@/lib/questionValidate";
import QuestionPreview from "./QuestionPreview";

const PLACEHOLDER = `{
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
  onAdd: (questions: Question[]) => void;
  addedIds: string[];
}

export default function ImportJsonPanel({ onAdd, addedIds }: Props) {
  const [jsonText, setJsonText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [itemErrors, setItemErrors] = useState<
    Array<{ index: number; errors: string[] }>
  >([]);
  const [previews, setPreviews] = useState<Question[]>([]);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  function handleValidate() {
    setAddedCount(null);
    setErrors([]);
    setItemErrors([]);
    setPreviews([]);

    const result = validateJsonStringBatch(jsonText, {
      checkDuplicate: true,
      addedIds,
    });

    if (!result.isArray) {
      const single = result.single!;
      if (!single.valid) {
        setErrors(single.errors);
        return;
      }
      setPreviews([single.normalized!]);
    } else {
      const batch = result.batch!;
      if (batch.results.length === 0) {
        setErrors(["配列が空です"]);
        return;
      }
      if (!batch.valid) {
        setItemErrors(
          batch.results
            .filter((r) => !r.valid)
            .map((r) => ({ index: r.index, errors: r.errors }))
        );
        return;
      }
      setPreviews(batch.allNormalized!);
    }
  }

  function handleAdd() {
    if (previews.length === 0) return;
    onAdd(previews);
    setAddedCount(previews.length);
    setPreviews([]);
    setJsonText("");
    setErrors([]);
    setItemErrors([]);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        1問（オブジェクト）または複数問（配列）のJSONを貼り付けてください。
        <br />
        <span className="text-indigo-500">id は省略可能です（自動採番されます）。</span>
      </p>

      <textarea
        className="w-full h-56 font-mono text-xs border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        placeholder={PLACEHOLDER}
        value={jsonText}
        onChange={(e) => {
          setJsonText(e.target.value);
          setErrors([]);
          setItemErrors([]);
          setPreviews([]);
          setAddedCount(null);
        }}
      />

      <button
        onClick={handleValidate}
        disabled={jsonText.trim() === ""}
        className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        検証する
      </button>

      {/* グローバルエラー */}
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

      {/* 問題ごとのエラー（配列モード） */}
      {itemErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-600 mb-3">
            エラーのある問題があります
          </p>
          {itemErrors.map(({ index, errors: errs }) => (
            <div key={index} className="mb-3">
              <p className="text-xs font-semibold text-red-500 mb-1">
                {index + 1} 問目:
              </p>
              <ul className="space-y-1">
                {errs.map((e, i) => (
                  <li key={i} className="text-sm text-red-700 flex gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 追加成功メッセージ */}
      {addedCount !== null && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          {addedCount} 問を追加しました
        </div>
      )}

      {/* プレビュー */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-600">
            プレビュー（{previews.length} 問）
          </p>
          {previews.map((q, i) => (
            <QuestionPreview key={q.id} question={q} index={i} />
          ))}
          <button
            onClick={handleAdd}
            className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all"
          >
            {previews.length === 1
              ? "問題を追加する"
              : `${previews.length} 問をまとめて追加する`}
          </button>
        </div>
      )}
    </div>
  );
}
