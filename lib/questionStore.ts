import { Question } from "@/types/question";

const STORAGE_KEY = "importedQuestions";

export function getImportedQuestions(): Question[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Question[]) : [];
  } catch {
    return [];
  }
}

export function saveImportedQuestions(qs: Question[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(qs));
}

/** 新規問題を追加（重複ID除外）。baseIds は JSON 本体のIDセット */
export function addImportedQuestions(newQs: Question[], baseIds: Set<string>): void {
  const existing = getImportedQuestions();
  const existingIds = new Set(existing.map((q) => q.id));
  const toAdd = newQs.filter((q) => !existingIds.has(q.id) && !baseIds.has(q.id));
  saveImportedQuestions([...existing, ...toAdd]);
}

export function removeImportedQuestion(id: string): void {
  saveImportedQuestions(getImportedQuestions().filter((q) => q.id !== id));
}

export function clearImportedQuestions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
