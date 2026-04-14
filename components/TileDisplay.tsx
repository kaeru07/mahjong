interface TileDisplayProps {
  tile: string;
  small?: boolean;
  dimmed?: boolean;  // ツモ切り
  highlight?: boolean;
}

export default function TileDisplay({ tile, small, dimmed, highlight }: TileDisplayProps) {
  const base =
    "inline-flex items-center justify-center rounded border font-bold select-none";
  const size = small
    ? "text-xs px-1 py-0.5 min-w-[1.6rem]"
    : "text-sm px-1.5 py-1 min-w-[2rem]";
  const color = highlight
    ? "bg-yellow-100 border-yellow-400 text-yellow-800"
    : "bg-white border-gray-400 text-gray-800";
  const opacity = dimmed ? "opacity-40" : "";

  return (
    <span className={`${base} ${size} ${color} ${opacity}`}>
      {tile}
    </span>
  );
}
