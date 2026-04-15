interface TileDisplayProps {
  tile: string;
  small?: boolean;
  dimmed?: boolean;   // ツモ切り
  highlight?: boolean;
  tileSize?: number;  // 表示幅(px)を直接指定。指定時は small を上書き
}

// スプライト画像上の各牌の座標 [x_start, y_start]
// 画像サイズ: 625×360px、牌1枚: 約50×69px
const TILE_POSITIONS: Record<string, [number, number]> = {
  // 字牌 (row 0, y=31)
  "東": [31, 31], "南": [88, 31], "西": [145, 31], "北": [202, 31],
  "白": [259, 31], "発": [316, 31], "中": [373, 31],
  // 萬子 (row 1, y=108)
  "1萬": [31, 108], "2萬": [88, 108], "3萬": [145, 108], "4萬": [202, 108],
  "5萬": [316, 108], "6萬": [373, 108], "7萬": [430, 108],
  "8萬": [486, 108], "9萬": [544, 108],
  // 索子 (row 2, y=185)
  "1索": [31, 185], "2索": [88, 185], "3索": [145, 185], "4索": [202, 185],
  "5索": [316, 185], "6索": [373, 185], "7索": [430, 185],
  "8索": [486, 185], "9索": [544, 185],
  // 筒子 (row 3, y=262)
  "1筒": [31, 262], "2筒": [88, 262], "3筒": [145, 262], "4筒": [202, 262],
  "5筒": [316, 262], "6筒": [373, 262], "7筒": [430, 262],
  "8筒": [486, 262], "9筒": [544, 262],
};

const SPRITE_W = 625;
const SPRITE_H = 360;
const TILE_W = 50;  // スプライト上の牌の幅(px)
const TILE_H = 69;  // スプライト上の牌の高さ(px)

// デフォルト表示幅
const DEFAULT_W_NORMAL = 38;
const DEFAULT_W_SMALL  = 24;

export default function TileDisplay({
  tile,
  small,
  dimmed,
  highlight,
  tileSize,
}: TileDisplayProps) {
  const pos = TILE_POSITIONS[tile];

  // 表示幅を決定: tileSize prop > small flag > デフォルト
  const displayW = tileSize ?? (small ? DEFAULT_W_SMALL : DEFAULT_W_NORMAL);
  const scale    = displayW / TILE_W;
  const displayH = Math.round(TILE_H * scale);
  const bgW      = Math.round(SPRITE_W * scale);
  const bgH      = Math.round(SPRITE_H * scale);
  const opacity  = dimmed ? 0.4 : 1;

  // スプライト未登録の牌はテキストフォールバック
  if (!pos) {
    const base  = "inline-flex items-center justify-center rounded border font-bold select-none";
    const size  = small
      ? "text-xs px-1 py-0.5 min-w-[1.6rem]"
      : "text-sm px-1.5 py-1 min-w-[2rem]";
    const color = highlight
      ? "bg-yellow-100 border-yellow-400 text-yellow-800"
      : "bg-white border-gray-400 text-gray-800";
    return (
      <span className={`${base} ${size} ${color}`} style={{ opacity }}>
        {tile}
      </span>
    );
  }

  const [sx, sy] = pos;
  const bgX = -Math.round(sx * scale);
  const bgY = -Math.round(sy * scale);

  return (
    <span
      className={`inline-block select-none rounded flex-shrink-0${
        highlight ? " ring-2 ring-yellow-400 ring-offset-1" : ""
      }`}
      style={{
        width: displayW,
        height: displayH,
        backgroundImage: "url(/tiles.jpg)",
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: "no-repeat",
        opacity,
        display: "inline-block",
      }}
      title={tile}
    />
  );
}
