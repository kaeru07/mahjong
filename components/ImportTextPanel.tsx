"use client";

import { useState } from "react";
import { Question } from "@/types/question";
import { parseTextToQuestion } from "@/lib/questionImport";
import { validateJsonString } from "@/lib/questionValidate";
import QuestionPreview from "./QuestionPreview";

const TEXT_PLACEHOLDER = `問題タイトル: 鳴き読み問題24
問題文: 浮いている8萬を切って押すべきか？
選択肢A: 8萬を切って押す
選択肢B: 8萬を止める
正解: A
解説: 打点条件と待ち候補から8萬を押せる。
タグ: 鳴き読み,押し引き
難易度: medium`;

interface Props {
  onAdd: (q: Question) => void;
  addedIds: string[];
}

export default function ImportTextPanel({ onAdd, addedIds }: Props) {
  const [inputText, setInputText] = useState("");
  const [draftJson, setDraftJson] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Question | null>(null);
  const [added, setAdded] = useState(false);

  function handleConvert() {
    setErrors([]);
    setPreview(null);
    setAdded(false);
    const draft = parseTextToQuestion(inputText);
    setDraftJson(JSON.stringify(draft, null, 2));
  }

  function handleValidateDraft() {
    setAdded(false);
    const result = validateJsonString(draftJson, {
      checkDuplicate: true,
      pendingIds: addedIds,
    });
    if (!result.valid) {
      setErrors(result.errors);
      setPreview(null);
      return;
    }
    setErrors([]);
    setPreview(result.normalized!);
  }

  function handleAdd() {
    if (!preview) return;
    onAdd(preview);
    setAdded(true);
    setPreview(null);
    setInputText("");
    setDraftJson("");
    setErrors([]);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        問題の元テキストを貼り付けると、JSON下書きに変換します。
        変換後に手修正もできます。
      </p>

      {/* 元テキスト入力 */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          元テキスト
        </label>
        <textarea
          className="w-full h-44 font-mono text-xs border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
          placeholder={TEXT_PLACEHOLDER}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setDraftJson("");
            setErrors([]);
            setPreview(null);
            setAdded(false);
          }}
        />
      </div>

      <button
        onClick={handleConvert}
        disabled={inputText.trim() === ""}
        className="w-full py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        JSON下書きに変換する
      </button>

      {/* JSON下書き（編集可能） */}
      {draftJson !== "" && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            JSON下書き（手修正可）
          </label>
          <textarea
            className="w-full h-64 font-mono text-xs border border-indigo-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y bg-indigo-50"
            value={draftJson}
            onChange={(e) => {
              setDraftJson(e.target.value);
              setErrors([]);
              setPreview(null);
              setAdded(false);
            }}
          />
          <button
            onClick={handleValidateDraft}
            disabled={draftJson.trim() === ""}
            className="mt-2 w-full py-2.5 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            検証してプレビュー
          </button>
        </div>
      )}

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
          問題を追加しました
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
            問題を追加する
          </button>
        </div>
      )}
    </div>
  );
}
