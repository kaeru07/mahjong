import { Discard } from "@/types/question";
import TileDisplay from "./TileDisplay";

interface DiscardAreaProps {
  label: string;
  discards: Discard[];
  compact?: boolean;
  riichi?: boolean;
}

export default function DiscardArea({ label, discards, compact, riichi }: DiscardAreaProps) {
  if (!discards || discards.length === 0) return null;

  return (
    <div className="mb-1">
      <span className="text-xs text-gray-500 mr-1">
        {label}:
        {riichi && (
          <span className="ml-1 text-xs font-bold text-red-500">リーチ</span>
        )}
      </span>
      <span className="inline-flex flex-wrap gap-0.5">
        {discards.map((d, i) => (
          <TileDisplay
            key={i}
            tile={d.tile}
            small={compact}
            dimmed={d.type === "tsumogiri"}
          />
        ))}
      </span>
    </div>
  );
}
