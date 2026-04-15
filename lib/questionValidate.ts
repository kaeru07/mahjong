import { Question } from "@/types/question";
import { getAllQuestions } from "@/lib/quiz";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalized?: Question;
}

const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function validateQuestion(
  raw: unknown,
  opts: { checkDuplicate?: boolean } = {}
): ValidationResult {
  const { checkDuplicate = true } = opts;
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ["オブジェクト形式で入力してください"] };
  }

  const obj = raw as Record<string, unknown>;

  // 必須フィールド
  if (!obj.id || typeof obj.id !== "string" || obj.id.trim() === "") {
    errors.push("id が必須です");
  }
  if (!obj.title || typeof obj.title !== "string" || obj.title.trim() === "") {
    errors.push("title が必須です");
  }
  if (!obj.question || typeof obj.question !== "string" || obj.question.trim() === "") {
    errors.push("question（問題文）が必須です");
  }
  if (
    !obj.explanation ||
    typeof obj.explanation !== "string" ||
    obj.explanation.trim() === ""
  ) {
    errors.push("explanation（解説）が必須です");
  }
  if (!obj.answer || typeof obj.answer !== "string" || obj.answer.trim() === "") {
    errors.push("answer が必須です");
  }

  // choices
  if (!Array.isArray(obj.choices) || obj.choices.length < 2) {
    errors.push("choices は2要素以上の配列が必要です");
  } else {
    const choices = obj.choices as Array<Record<string, unknown>>;
    choices.forEach((c, i) => {
      if (!c.key || typeof c.key !== "string" || c.key.trim() === "") {
        errors.push(`choices[${i}].key が必要です`);
      }
      if (!c.label || typeof c.label !== "string" || c.label.trim() === "") {
        errors.push(`choices[${i}].label が必要です`);
      }
    });

    if (
      typeof obj.answer === "string" &&
      obj.answer.trim() !== "" &&
      !choices.some((c) => c.key === obj.answer)
    ) {
      errors.push(
        `answer "${obj.answer}" が choices の key に存在しません`
      );
    }
  }

  // difficulty
  if (obj.difficulty !== undefined) {
    if (
      !VALID_DIFFICULTIES.includes(
        obj.difficulty as (typeof VALID_DIFFICULTIES)[number]
      )
    ) {
      errors.push(
        `difficulty は easy / medium / hard のいずれかにしてください（現在: "${obj.difficulty}"）`
      );
    }
  }

  // id 重複チェック
  if (checkDuplicate && typeof obj.id === "string" && obj.id.trim() !== "") {
    const idStr = (obj.id as string).trim();
    const existing = getAllQuestions();
    if (existing.some((q) => q.id === idStr)) {
      errors.push(`id "${idStr}" は既存の問題と重複しています`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 正規化
  const normalized: Question = {
    id: (obj.id as string).trim(),
    title: (obj.title as string).trim(),
    question: (obj.question as string).trim(),
    choices: (
      obj.choices as Array<{ key: string; label: string }>
    ).map((c) => ({
      key: c.key.trim(),
      label: c.label.trim(),
    })),
    answer: (obj.answer as string).trim(),
    explanation: (obj.explanation as string).trim(),
    tags: Array.isArray(obj.tags)
      ? (obj.tags as unknown[])
          .map((t) => String(t).trim())
          .filter((t) => t.length > 0)
      : undefined,
    difficulty: obj.difficulty as Question["difficulty"],
  };

  return { valid: true, errors: [], normalized };
}

/** JSON 文字列をパースして validateQuestion にかける */
export function validateJsonString(
  jsonStr: string,
  opts: { checkDuplicate?: boolean } = {}
): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return {
      valid: false,
      errors: [`JSON のパースに失敗しました: ${(e as Error).message}`],
    };
  }
  return validateQuestion(parsed, opts);
}
