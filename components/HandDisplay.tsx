import TileDisplay from "./TileDisplay";

interface HandDisplayProps {
  hand: string[];
  tsumo?: string | null;
}

export default function HandDisplay({ hand, tsumo }: HandDisplayProps) {
  return (
    <div className="mb-3">
      <div className="text-xs text-gray-500 mb-1">手牌</div>
      <div className="flex flex-wrap gap-1 items-end">
        {hand.map((tile, i) => (
          <TileDisplay key={i} tile={tile} />
        ))}
        {tsumo && (
          <>
            <span className="text-gray-300 mx-1">|</span>
            <TileDisplay tile={tsumo} highlight />
          </>
        )}
      </div>
    </div>
  );
}
