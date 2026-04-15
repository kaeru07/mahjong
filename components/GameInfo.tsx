import { Question } from "@/types/question";
import TileDisplay from "./TileDisplay";

interface GameInfoProps {
  q: Question;
}

const PLAYER_KEYS = ["self", "shimocha", "toimen", "kamicha"] as const;
const PLAYER_LABELS: Record<string, string> = {
  self: "自",
  shimocha: "下",
  toimen: "対",
  kamicha: "上",
};

export default function GameInfo({ q }: GameInfoProps) {
  const sit = q.situation;
  if (!sit) return null;

  const hasRound  = !!sit.round;
  const hasDora   = (sit.dora?.length ?? 0) > 0;
  const hasScores = !!sit.scores;

  if (!hasRound && !hasDora && !hasScores) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-sm">
      {/* 局情報 + ドラ */}
      {(hasRound || hasDora) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mb-1.5">
          {sit.round?.kyoku && (
            <span className="font-bold text-indigo-700">{sit.round.kyoku}</span>
          )}
          {sit.round?.honba !== undefined && sit.round.honba > 0 && (
            <span className="text-gray-600">{sit.round.honba}本場</span>
          )}
          {sit.round?.kyotaku !== undefined && sit.round.kyotaku > 0 && (
            <span className="text-gray-600">供託{sit.round.kyotaku}本</span>
          )}
          {hasDora && (
            <span className="flex items-center gap-1">
              <span className="text-xs text-gray-500">ドラ</span>
              {sit.dora!.map((d, i) => (
                <TileDisplay key={i} tile={d} small />
              ))}
            </span>
          )}
        </div>
      )}

      {/* 点数 */}
      {hasScores && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {PLAYER_KEYS.map((key) => {
            const val = sit.scores?.[key];
            if (val === undefined) return null;
            return (
              <span key={key}>
                {PLAYER_LABELS[key]}:{" "}
                <span className="font-medium text-gray-700">
                  {val.toLocaleString()}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
