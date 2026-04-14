import questionsData from "@/data/questions.json";
import { Question } from "@/types/question";

const questions = questionsData as Question[];

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

export function calcScore(answers: string[], qs: Question[]): number {
  return answers.filter((a, i) => a === qs[i]?.answer).length;
}

/** choices の key から label を引く */
export function getChoiceLabel(q: Question, key: string): string {
  return q.choices.find((c) => c.key === key)?.label ?? key;
}
