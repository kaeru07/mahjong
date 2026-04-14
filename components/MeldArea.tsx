import { Meld } from "@/types/question";
import TileDisplay from "./TileDisplay";

interface MeldAreaProps {
  label: string;
  melds: Meld[];
}

const FROM_LABEL: Record<string, string> = {
  shimocha: "下↓",
  toimen: "対←",
  kamicha: "上↑",
};

const TYPE_LABEL: Record<string, string> = {
  chi: "チー",
  pon: "ポン",
  kan: "カン",
  ankan: "暗カン",
  kakan: "加カン",
};

export default function MeldArea({ label, melds }: MeldAreaProps) {
  if (!melds || melds.length === 0) return null;

  return (
    <div className="mb-1">
      <span className="text-xs text-gray-500 mr-1">{label}副露:</span>
      <span className="inline-flex flex-wrap gap-1.5">
        {melds.map((m, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-0.5 bg-orange-50 border border-orange-200 rounded px-1 py-0.5"
          >
            <span className="text-xs text-orange-500 mr-0.5">
              {TYPE_LABEL[m.type] ?? m.type}
              {m.from && (
                <span className="text-orange-400 text-[10px] ml-0.5">
                  {FROM_LABEL[m.from] ?? m.from}
                </span>
              )}
            </span>
            {m.tiles.map((t, j) => (
              <TileDisplay key={j} tile={t} small highlight={t === m.called} />
            ))}
          </span>
        ))}
      </span>
    </div>
  );
}
