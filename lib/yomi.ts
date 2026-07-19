import yomiData from "@/data/yomi-questions.json";
import { YomiQuestion, SeatKey, SourceValidation, SourceValidationStatus } from "@/types/yomi";

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

// 出典の卓・段位帯ラベル（sourceRank → 日本語）
export const YOMI_SOURCE_RANK_LABEL: Record<string, string> = {
  houou: "鳳凰卓",
  tokujou: "特上卓",
  joukyuu: "上級卓",
  ippan: "一般卓",
  konten: "魂天",
  ouza: "王座の間",
  tama: "魂の間",
  manual: "手作成",
};

export function getYomiSourceRankLabel(rank?: string): string {
  if (!rank) return YOMI_SOURCE_RANK_LABEL.manual;
  return YOMI_SOURCE_RANK_LABEL[rank] ?? rank;
}

export interface YomiSourceStats {
  total: number;
  byType: Record<string, number>; // sourceType ごとの問題数（"tenhou" 等。未設定は "manual"）
  byRank: Record<string, number>; // sourceRank ごとの問題数（"houou"/"konten"/"ouza" 等。未設定は "manual"）
}

// 問題集の出典別集計（鳳凰卓問題数 / 魂天問題数 / 王座問題数 等を取得可能にする）
export function getYomiSourceStats(all: YomiQuestion[]): YomiSourceStats {
  const byType: Record<string, number> = {};
  const byRank: Record<string, number> = {};
  for (const q of all) {
    const t = q.question.source?.sourceType ?? "manual";
    const r = q.question.source?.sourceRank ?? "manual";
    byType[t] = (byType[t] ?? 0) + 1;
    byRank[r] = (byRank[r] ?? 0) + 1;
  }
  return { total: all.length, byType, byRank };
}

// ─────────────────────────────────────────────
// 原本再現性（sourceValidation）の表示ヘルパー
// ─────────────────────────────────────────────

export const SOURCE_VALIDATION_STATUS_LABEL: Record<SourceValidationStatus, string> = {
  exact: "原本一致",
  partial: "一部差分",
  failed: "原本不一致",
};

export function getSourceValidationStatusLabel(s?: SourceValidationStatus): string {
  if (!s) return "未検証";
  return SOURCE_VALIDATION_STATUS_LABEL[s] ?? s;
}

export function getSourceValidationStatusClass(s?: SourceValidationStatus): string {
  if (s === "exact") return "bg-green-100 text-green-700";
  if (s === "partial") return "bg-yellow-100 text-yellow-700";
  if (s === "failed") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-500"; // 未検証
}

// 一致率を「62%」表記にする
export function formatMatchRate(sv?: SourceValidation): string {
  if (!sv) return "—";
  return `${Math.round(sv.matchRate * 100)}%`;
}

// 原本検証の集計（問題集全体）
export interface YomiValidationStats {
  total: number;
  validated: number;           // sourceValidation を持つ問題数
  exact: number;
  partial: number;
  failed: number;
  unvalidated: number;         // sourceValidation を持たない（未検証）
}

export function getYomiValidationStats(all: YomiQuestion[]): YomiValidationStats {
  const stats: YomiValidationStats = { total: all.length, validated: 0, exact: 0, partial: 0, failed: 0, unvalidated: 0 };
  for (const q of all) {
    const sv = q.question.sourceValidation;
    if (!sv) { stats.unvalidated++; continue; }
    stats.validated++;
    if (sv.status === "exact") stats.exact++;
    else if (sv.status === "partial") stats.partial++;
    else stats.failed++;
  }
  return stats;
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
