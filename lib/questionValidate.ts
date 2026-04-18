import { Question } from "@/types/question";
import { getAllQuestions } from "@/lib/quiz";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalized?: Question;
}

export interface BatchItemResult {
  index: number;
  valid: boolean;
  errors: string[];
  normalized?: Question;
}

export interface BatchValidationResult {
  valid: boolean;
  results: BatchItemResult[];
  allNormalized?: Question[];
}

const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

/**
 * 既存IDと追加中IDを避けて次の連番IDを生成する
 * 例: q001, q002, ... q010 が存在すれば q011 を返す
 */
export function generateNextId(
  existingIds: string[],
  pendingIds: string[] = []
): string {
  const allIds = new Set([...existingIds, ...pendingIds]);
  let maxNum = 0;
  for (const id of allIds) {
    const m = id.match(/^q(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  let nextNum = maxNum + 1;
  while (allIds.has(`q${String(nextNum).padStart(3, "0")}`)) {
    nextNum++;
  }
  return `q${String(nextNum).padStart(3, "0")}`;
}

export function validateQuestion(
  raw: unknown,
  opts: { checkDuplicate?: boolean; pendingIds?: string[] } = {}
): ValidationResult {
  const { checkDuplicate = true, pendingIds = [] } = opts;
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ["オブジェクト形式で入力してください"] };
  }

  const obj = raw as Record<string, unknown>;

  // id は省略可能（省略時は自動採番）
  const hasId =
    typeof obj.id === "string" && (obj.id as string).trim() !== "";

  // 必須フィールド
  if (!obj.title || typeof obj.title !== "string" || obj.title.trim() === "") {
    errors.push("title が必須です");
  }
  if (
    !obj.question ||
    typeof obj.question !== "string" ||
    obj.question.trim() === ""
  ) {
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
      errors.push(`answer "${obj.answer}" が choices の key に存在しません`);
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

  // id 重複チェック（手動指定時のみ）
  if (hasId && checkDuplicate) {
    const idStr = (obj.id as string).trim();
    const existing = getAllQuestions();
    if (existing.some((q) => q.id === idStr)) {
      errors.push(`id "${idStr}" は既存の問題と重複しています`);
    }
    if (pendingIds.includes(idStr)) {
      errors.push(`id "${idStr}" は他の追加問題と重複しています`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // id が未指定なら自動採番
  const existingIds = getAllQuestions().map((q) => q.id);
  const id = hasId
    ? (obj.id as string).trim()
    : generateNextId(existingIds, pendingIds);

  // `board` フィールドを `situation` にフォールバック（旧形式互換）
  const situationRaw = obj.situation ?? obj.board;

  const normalized: Question = {
    id,
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
    ...(situationRaw !== undefined
      ? { situation: situationRaw as Question["situation"] }
      : {}),
    ...(obj.book !== undefined ? { book: obj.book as string } : {}),
    ...(obj.chapter !== undefined ? { chapter: obj.chapter as string } : {}),
    ...(obj.sourcePage !== undefined ? { sourcePage: obj.sourcePage as number } : {}),
  };

  return { valid: true, errors: [], normalized };
}

/** JSON 文字列をパースして validateQuestion にかける（単体用） */
export function validateJsonString(
  jsonStr: string,
  opts: { checkDuplicate?: boolean; pendingIds?: string[] } = {}
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

/**
 * JSON 文字列をパースし、単体オブジェクトと配列の両方に対応して検証する。
 * addedIds には今セッションで既に追加済みの id を渡す（重複防止）。
 */
export function validateJsonStringBatch(
  jsonStr: string,
  opts: { checkDuplicate?: boolean; addedIds?: string[] } = {}
): {
  isArray: boolean;
  single?: ValidationResult;
  batch?: BatchValidationResult;
} {
  const { checkDuplicate = true, addedIds = [] } = opts;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return {
      isArray: false,
      single: {
        valid: false,
        errors: [`JSON のパースに失敗しました: ${(e as Error).message}`],
      },
    };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return {
        isArray: true,
        batch: { valid: false, results: [] },
      };
    }

    // 追加済みIDを起点にして、バッチ内で重複しないよう順次採番
    const pendingIds: string[] = [...addedIds];
    const results: BatchItemResult[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const result = validateQuestion(parsed[i], {
        checkDuplicate,
        pendingIds: [...pendingIds],
      });
      results.push({ index: i, ...result });
      if (result.normalized) {
        pendingIds.push(result.normalized.id);
      }
    }

    const allValid = results.every((r) => r.valid);
    return {
      isArray: true,
      batch: {
        valid: allValid,
        results,
        allNormalized: allValid ? results.map((r) => r.normalized!) : undefined,
      },
    };
  } else {
    return {
      isArray: false,
      single: validateQuestion(parsed, { checkDuplicate, pendingIds: addedIds }),
    };
  }
}
