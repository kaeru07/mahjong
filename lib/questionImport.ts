import { Question } from "@/types/question";
import { getAllQuestions } from "@/lib/quiz";

/**
 * テキスト貼り付け → Question 下書き変換（ルールベース）
 *
 * 対応フォーマット例:
 *   問題タイトル: 鳴き読み問題24
 *   問題文: 浮いている8萬を切って押すべきか？
 *   選択肢A: 8萬を切って押す
 *   選択肢B: 8萬を止める
 *   正解: A
 *   解説: 打点条件と待ち候補から8萬を押せる。
 *   タグ: 鳴き読み,押し引き
 *   難易度: medium
 *   ID: q100   (省略時は自動採番)
 */
export function parseTextToQuestion(text: string): Partial<Question> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  /** キーリストのどれかに一致した行の値を返す */
  function get(keys: string[]): string | undefined {
    for (const line of lines) {
      for (const key of keys) {
        // 「キー:」または「キー：」
        const prefix = key + ":";
        const prefixFull = key + "：";
        if (line.startsWith(prefix)) {
          return line.slice(prefix.length).trim();
        }
        if (line.startsWith(prefixFull)) {
          return line.slice(prefixFull.length).trim();
        }
      }
    }
    return undefined;
  }

  // 選択肢: 「選択肢A:」「A:」「A.」などに対応
  const choices: { key: string; label: string }[] = [];
  for (const line of lines) {
    const m =
      line.match(/^選択肢\s*([A-Za-z])[:：]\s*(.+)/) ||
      line.match(/^([A-Z])[.:：]\s*(.+)/);
    if (m && choices.length < 8) {
      choices.push({ key: m[1].toUpperCase(), label: m[2].trim() });
    }
  }

  // タグ
  const tagsRaw = get(["タグ", "tags", "tag"]);
  const tags = tagsRaw
    ? tagsRaw
        .split(/[,、，]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : undefined;

  // difficulty 正規化
  const difficultyMap: Record<string, Question["difficulty"]> = {
    easy: "easy",
    易: "easy",
    medium: "medium",
    普通: "medium",
    normal: "medium",
    hard: "hard",
    難: "hard",
  };
  const diffRaw = get(["難易度", "difficulty"])?.toLowerCase() ?? "";
  // lowercase後もマップに無い場合は元の値（日本語）を試す
  const diffOriginal = get(["難易度", "difficulty"]) ?? "";
  const difficulty =
    difficultyMap[diffRaw] ?? difficultyMap[diffOriginal] ?? "medium";

  // ID: 手動指定 or 自動採番
  const manualId = get(["ID", "id", "Id"]);
  const existing = getAllQuestions();
  const nextNum = existing.length + 1;
  const autoId = `q${String(nextNum).padStart(3, "0")}`;

  return {
    id: manualId?.trim() ?? autoId,
    title: get(["問題タイトル", "タイトル", "title"]) ?? "",
    question: get(["問題文", "question"]) ?? "",
    choices: choices.length >= 2 ? choices : undefined,
    answer: get(["正解", "answer", "Answer"]) ?? "",
    explanation: get(["解説", "explanation"]) ?? "",
    tags,
    difficulty,
  };
}

/** ブラウザ側でJSONファイルをダウンロードさせる */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 既存 questions.json に新問題をマージ（id重複は除外） */
export function mergeWithExisting(newQuestions: Question[]): Question[] {
  const existing = getAllQuestions();
  const existingIds = new Set(existing.map((q) => q.id));
  const toAdd = newQuestions.filter((q) => !existingIds.has(q.id));
  return [...existing, ...toAdd];
}
