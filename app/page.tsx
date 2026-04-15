import { Suspense } from "react";
import { getAllQuestions, getAllTags, getAllDifficulties } from "@/lib/quiz";
import HomeContent from "@/components/HomeContent";

export default function Home() {
  const allQuestions = getAllQuestions();
  const allTags = getAllTags(allQuestions);
  const allDifficulties = getAllDifficulties(allQuestions);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          読み込み中...
        </div>
      }
    >
      <HomeContent
        allQuestions={allQuestions}
        allTags={allTags}
        allDifficulties={allDifficulties}
      />
    </Suspense>
  );
}
