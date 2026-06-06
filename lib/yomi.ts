import yomiData from "@/data/yomi-questions.json";
import { YomiQuestion, SeatKey } from "@/types/yomi";

const questions: YomiQuestion[] = yomiData as YomiQuestion[];

export function getAllYomiQuestions(): YomiQuestion[] {
  return questions;
}

export function filterYomiQuestions(
  all: YomiQuestion[],
  tags: string[],
  difficulty: string
): YomiQuestion[] {
  return all.filter((q) => {
    if (difficulty && difficulty !== "all" && q.question.difficulty !== difficulty)
      return false;
    if (tags.length > 0) {
      if (!tags.some((t) => q.question.tags.includes(t))) return false;
    }
    return true;
  });
}

export function getAllYomiTags(all: YomiQuestion[]): string[] {
  const set = new Set<string>();
  all.forEach((q) => q.question.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}

export function getAllYomiDifficulties(
  all: YomiQuestion[]
): YomiQuestion["question"]["difficulty"][] {
  const order: YomiQuestion["question"]["difficulty"][] = ["easy", "medium", "hard"];
  const found = new Set(all.map((q) => q.question.difficulty));
  return order.filter((d) => found.has(d));
}

export function pickYomiQuestions(all: YomiQuestion[], count: number): YomiQuestion[] {
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  if (count <= 0) return shuffled;
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function calcYomiScore(answers: string[], qs: YomiQuestion[]): number {
  return answers.filter((a, i) => a === qs[i]?.question.correctTile).length;
}

export function getDifficultyLabel(d: string): string {
  if (d === "easy") return "易";
  if (d === "medium") return "普通";
  if (d === "hard") return "難";
  return d;
}

export function getDifficultyClass(d: string): string {
  if (d === "easy") return "bg-green-100 text-green-700";
  if (d === "medium") return "bg-yellow-100 text-yellow-700";
  if (d === "hard") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-500";
}

export const SEAT_LABEL: Record<SeatKey, string> = {
  self: "自分",
  shimocha: "下家",
  toimen: "対面",
  kamicha: "上家",
};

export const MELD_TYPE_LABEL: Record<string, string> = {
  chi: "チー",
  pon: "ポン",
  kan: "カン",
  ankan: "暗カン",
  kakan: "加カン",
};

export const FROM_LABEL: Record<string, string> = {
  shimocha: "下",
  toimen: "対",
  kamicha: "上",
};
