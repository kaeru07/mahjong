import { Question, PlayerInfo } from "@/types/question";
import GameInfo from "./GameInfo";
import HandDisplay from "./HandDisplay";
import DiscardArea from "./DiscardArea";
import MeldArea from "./MeldArea";

interface BoardViewProps {
  q: Question;
}

// 表示順: 対面→上家→下家→自分
const PLAYER_ORDER = ["toimen", "kamicha", "shimocha", "self"] as const;

const LABELS: Record<string, string> = {
  self:     "自分",
  shimocha: "下家",
  toimen:   "対面",
  kamicha:  "上家",
};

function hasContent(p: PlayerInfo | undefined): boolean {
  if (!p) return false;
  return (
    (p.hand     !== undefined && p.hand.length     > 0) ||
    (p.discards !== undefined && p.discards.length > 0) ||
    (p.melds    !== undefined && p.melds.length    > 0)
  );
}

/** プレイヤーのリーチ宣言牌インデックスを返す */
function riichiTileIndex(p: PlayerInfo | undefined): number | undefined {
  if (!p?.riichi || !p.discards) return undefined;
  // 最後の手出し牌をリーチ宣言牌とみなす（簡易判定）
  const idx = [...p.discards].reverse().findIndex((d) => d.type === "tedashi");
  return idx >= 0 ? p.discards.length - 1 - idx : undefined;
}

export default function BoardView({ q }: BoardViewProps) {
  const sit = q.situation;
  if (!sit) return null;

  const selfPlayer = sit.players?.self;
  const hasHand    = (selfPlayer?.hand?.length ?? 0) > 0;

  const hasAnyBoard = PLAYER_ORDER.some((key) =>
    hasContent(sit.players?.[key])
  );

  if (!sit.round && !sit.dora && !sit.scores && !hasHand && !hasAnyBoard) {
    return null;
  }

  // 他家（自分以外）に表示すべき情報があるか
  const hasOthers = (["toimen", "kamicha", "shimocha"] as const).some((k) =>
    hasContent(sit.players?.[k])
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mb-4">
      {/* 局情報・ドラ・点数 */}
      <GameInfo q={q} />

      {/* 自分の手牌（最重要 — 大きく表示） */}
      {hasHand && (
        <div className="mb-2">
          <HandDisplay
            hand={selfPlayer!.hand!}
            tsumo={selfPlayer?.tsumo ?? undefined}
          />
          {/* 自分の副露 */}
          {(selfPlayer?.melds?.length ?? 0) > 0 && (
            <MeldArea label="自分" melds={selfPlayer!.melds!} />
          )}
        </div>
      )}

      {/* 自分の捨て牌 */}
      {(selfPlayer?.discards?.length ?? 0) > 0 && (
        <DiscardArea
          label="自分"
          discards={selfPlayer!.discards!}
          riichi={selfPlayer?.riichi}
          riichiIndex={riichiTileIndex(selfPlayer)}
        />
      )}

      {/* 他家の捨て牌・副露 */}
      {hasOthers && (
        <div className="border-t border-gray-100 pt-2 mt-1">
          <div className="text-xs font-medium text-gray-400 mb-2">他家</div>
          <div className="space-y-1">
            {PLAYER_ORDER.filter((k) => k !== "self").map((key) => {
              const p = sit.players?.[key];
              if (!hasContent(p)) return null;
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  {/* 捨て牌 */}
                  {(p?.discards?.length ?? 0) > 0 && (
                    <DiscardArea
                      label={LABELS[key]}
                      discards={p!.discards!}
                      compact
                      riichi={p?.riichi}
                      riichiIndex={riichiTileIndex(p)}
                    />
                  )}
                  {/* 副露 */}
                  {(p?.melds?.length ?? 0) > 0 && (
                    <MeldArea label={LABELS[key]} melds={p!.melds!} compact />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
