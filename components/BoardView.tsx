import { Question, PlayerInfo } from "@/types/question";
import GameInfo from "./GameInfo";
import HandDisplay from "./HandDisplay";
import DiscardArea from "./DiscardArea";
import MeldArea from "./MeldArea";

interface BoardViewProps {
  q: Question;
}

const LABELS: Record<string, string> = {
  self: "自分",
  shimocha: "下家",
  toimen: "対面",
  kamicha: "上家",
};

const PLAYER_ORDER = ["toimen", "kamicha", "shimocha", "self"] as const;

function hasContent(p: PlayerInfo | undefined): boolean {
  if (!p) return false;
  return (
    (p.hand !== undefined && p.hand.length > 0) ||
    (p.discards !== undefined && p.discards.length > 0) ||
    (p.melds !== undefined && p.melds.length > 0)
  );
}

export default function BoardView({ q }: BoardViewProps) {
  const sit = q.situation;
  if (!sit) return null;

  const selfPlayer = sit.players?.self;
  const hasHand = (selfPlayer?.hand?.length ?? 0) > 0;

  const hasAnyBoard = PLAYER_ORDER.some((key) =>
    hasContent(sit.players?.[key])
  );

  if (!sit.round && !sit.dora && !sit.scores && !hasHand && !hasAnyBoard) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      {/* 局情報・ドラ・点数 */}
      <GameInfo q={q} />

      {/* 自分の手牌 */}
      {hasHand && (
        <HandDisplay
          hand={selfPlayer!.hand!}
          tsumo={selfPlayer?.tsumo ?? undefined}
        />
      )}

      {/* 各プレイヤーの捨て牌・副露 */}
      {hasAnyBoard && (
        <div className="border-t border-gray-100 pt-3 mt-2">
          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            捨て牌 / 副露
          </div>
          {PLAYER_ORDER.map((key) => {
            const p = sit.players?.[key];
            if (!hasContent(p)) return null;

            return (
              <div key={key} className="mb-2">
                <DiscardArea
                  label={LABELS[key]}
                  discards={p?.discards ?? []}
                  compact={key !== "self"}
                  riichi={p?.riichi}
                />
                <MeldArea label={LABELS[key]} melds={p?.melds ?? []} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
