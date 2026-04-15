import questionsData from "@/data/questions.json";
import { Question } from "@/types/question";

// difficulty の旧表記を正規化（"normal" → "medium"）
function normalizeDifficulty(d: string | undefined): Question["difficulty"] {
  if (d === "normal") return "medium";
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return undefined;
}

// タグを正規化（前後空白除去・空文字除去）
function normalizeTag(t: string): string {
  return t.trim();
}

// JSON 全問を読み込み、difficulty を正規化して返す
const questions: Question[] = (questionsData as Question[]).map((q) => ({
  ...q,
  difficulty: normalizeDifficulty(q.difficulty),
  tags: q.tags?.map(normalizeTag).filter((t) => t.length > 0),
}));

export function getAllQuestions(): Question[] {
  return questions;
}

export function getRandomQuestions(count = 10): Question[] {
  return [...questions]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

export function filterQuestions(
  all: Question[],
  tags: string[],
  difficulty: string
): Question[] {
  return all.filter((q) => {
    if (difficulty && difficulty !== "all" && q.difficulty !== difficulty) return false;
    if (tags.length > 0) {
      if (!q.tags || !tags.every((t) => q.tags!.includes(t))) return false;
    }
    return true;
  });
}

export function getAllTags(all: Question[]): string[] {
  const tagSet = new Set<string>();
  all.forEach((q) => q.tags?.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

/** JSON に実際に存在する difficulty を重複なしで返す（"all" は含まない） */
export function getAllDifficulties(all: Question[]): Question["difficulty"][] {
  const order: Question["difficulty"][] = ["easy", "medium", "hard"];
  const found = new Set(all.map((q) => q.difficulty).filter(Boolean));
  return order.filter((d) => found.has(d)) as Question["difficulty"][];
}

/** difficulty 値を日本語ラベルに変換 */
export function getDifficultyLabel(d: string | undefined): string {
  if (d === "easy") return "易";
  if (d === "medium") return "普通";
  if (d === "hard") return "難";
  return d ?? "";
}

/** difficulty 値に対応する CSS クラスを返す */
export function getDifficultyClass(d: string | undefined): string {
  if (d === "easy") return "bg-green-100 text-green-700";
  if (d === "medium") return "bg-yellow-100 text-yellow-700";
  if (d === "hard") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-500";
}

export function calcScore(answers: string[], qs: Question[]): number {
  return answers.filter((a, i) => a === qs[i]?.answer).length;
}

/** choices の key から label を引く */
export function getChoiceLabel(q: Question, key: string): string {
  return q.choices.find((c) => c.key === key)?.label ?? key;
}
