import { Meld } from "@/types/question";
import TileDisplay from "./TileDisplay";

interface MeldAreaProps {
  label: string;
  melds: Meld[];
  compact?: boolean;
}

const FROM_LABEL: Record<string, string> = {
  shimocha: "下",
  toimen: "対",
  kamicha: "上",
};

const TYPE_LABEL: Record<string, string> = {
  chi:   "チー",
  pon:   "ポン",
  kan:   "カン",
  ankan: "暗カン",
  kakan: "加カン",
};

export default function MeldArea({ label, melds, compact }: MeldAreaProps) {
  if (!melds || melds.length === 0) return null;

  return (
    <div className="mb-2">
      <span className="text-xs text-gray-500 mr-1">{label} 副露</span>
      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {melds.map((m, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-0.5 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5"
          >
            {/* 鳴き種別 + 方向 */}
            <span className="text-xs text-orange-600 font-medium mr-0.5 flex-shrink-0">
              {TYPE_LABEL[m.type] ?? m.type}
              {m.from && (
                <span className="text-orange-400 text-[9px] ml-0.5">
                  ({FROM_LABEL[m.from] ?? m.from})
                </span>
              )}
            </span>
            {/* 牌 */}
            {m.tiles.map((t, j) => (
              <TileDisplay
                key={j}
                tile={t}
                small={compact}
                highlight={t === m.called}
              />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
