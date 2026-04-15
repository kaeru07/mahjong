import { DiscardItem } from "@/types/question";
import TileDisplay from "./TileDisplay";

interface DiscardAreaProps {
  label: string;
  discards: DiscardItem[];
  compact?: boolean;
  riichi?: boolean;
  /** リーチ宣言牌のインデックス（その牌を横向き表示） */
  riichiIndex?: number;
}

// 捨て牌は1行6枚で折り返す
const ROW_SIZE = 6;

export default function DiscardArea({
  label,
  discards,
  compact,
  riichi,
  riichiIndex,
}: DiscardAreaProps) {
  if (!discards || discards.length === 0) return null;

  // 6枚ごとの行に分割
  const rows: DiscardItem[][] = [];
  for (let i = 0; i < discards.length; i += ROW_SIZE) {
    rows.push(discards.slice(i, i + ROW_SIZE));
  }

  return (
    <div className="mb-2">
      {/* ラベル + リーチ表示 */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-xs text-gray-500">{label}</span>
        {riichi && (
          <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded px-1">
            リーチ
          </span>
        )}
      </div>

      {/* 捨て牌グリッド */}
      <div className="flex flex-col gap-0.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex flex-nowrap gap-0.5 items-end">
            {row.map((d, ci) => {
              const idx = ri * ROW_SIZE + ci;
              const isRiichiTile =
                riichi && riichiIndex !== undefined && idx === riichiIndex;
              const isTsumogiri = d.type === "tsumogiri";
              return (
                <span
                  key={ci}
                  className={`relative inline-block flex-shrink-0${isRiichiTile ? " ring-1 ring-red-400 rounded" : ""}`}
                >
                  <TileDisplay
                    tile={d.tile}
                    small={compact}
                    dimmed={isTsumogiri}
                  />
                  {isTsumogiri && (
                    <span
                      className="absolute bottom-0.5 right-0.5 rounded-full bg-sky-400 pointer-events-none"
                      style={{ width: 4, height: 4 }}
                    />
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
