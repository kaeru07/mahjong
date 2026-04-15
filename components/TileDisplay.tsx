export type Rotation = 0 | 90 | 180 | 270;

interface TileDisplayProps {
  tile: string;
  small?: boolean;
  dimmed?: boolean;   // ツモ切り
  highlight?: boolean;
  tileSize?: number;  // 表示幅(px)を直接指定。指定時は small を上書き
  rotation?: Rotation;
  faceDown?: boolean; // 裏牌表示
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

const DEFAULT_W_NORMAL = 38;
const DEFAULT_W_SMALL  = 24;

export default function TileDisplay({
  tile,
  small,
  dimmed,
  highlight,
  tileSize,
  rotation = 0,
  faceDown = false,
}: TileDisplayProps) {
  const displayW = tileSize ?? (small ? DEFAULT_W_SMALL : DEFAULT_W_NORMAL);
  const scale    = displayW / TILE_W;
  const displayH = Math.round(TILE_H * scale);
  const opacity  = dimmed ? 0.4 : 1;

  // 90/270度回転時は縦横が入れ替わる
  const isRotated90 = rotation === 90 || rotation === 270;
  const outerW = isRotated90 ? displayH : displayW;
  const outerH = isRotated90 ? displayW : displayH;

  // 回転時に内側要素を中央に合わせるオフセット
  // rotation=90/270: innerLeft=(displayH-displayW)/2, innerTop=(displayW-displayH)/2
  // → 外側コンテナ中心 (outerW/2, outerH/2) と内側要素中心 (left+displayW/2, top+displayH/2) が一致
  const innerLeft = isRotated90 ? (displayH - displayW) / 2 : 0;
  const innerTop  = isRotated90 ? (displayW - displayH) / 2 : 0;

  const rotateStyle: React.CSSProperties = rotation !== 0 ? {
    position: "absolute",
    left: innerLeft,
    top: innerTop,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "center center",
  } : {};

  const baseStyle: React.CSSProperties = {
    width: displayW,
    height: displayH,
    opacity,
    borderRadius: 2,
  };

  // ── 裏牌 ──
  if (faceDown) {
    const faceDownStyle: React.CSSProperties = {
      ...baseStyle,
      ...rotateStyle,
      backgroundColor: "#1e3a2f",
      backgroundImage:
        "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.06) 3px, rgba(255,255,255,0.06) 6px)",
      border: "1px solid #2d5a42",
    };

    if (rotation !== 0) {
      return (
        <span
          className={`inline-block relative flex-shrink-0${highlight ? " ring-2 ring-yellow-400 ring-offset-1" : ""}`}
          style={{ width: outerW, height: outerH }}
        >
          <span className="absolute" style={faceDownStyle} title="?" />
        </span>
      );
    }
    return (
      <span
        className={`inline-block flex-shrink-0${highlight ? " ring-2 ring-yellow-400 ring-offset-1" : ""}`}
        style={faceDownStyle}
        title="?"
      />
    );
  }

  // ── スプライト未登録 → テキストフォールバック（回転なし）──
  const pos = TILE_POSITIONS[tile];
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

  // ── スプライト表示 ──
  const [sx, sy] = pos;
  const bgX = -Math.round(sx * scale);
  const bgY = -Math.round(sy * scale);
  const bgW = Math.round(SPRITE_W * scale);
  const bgH = Math.round(SPRITE_H * scale);

  const spriteStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundImage: "url(/tiles.jpg)",
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `${bgX}px ${bgY}px`,
    backgroundRepeat: "no-repeat",
  };

  if (rotation !== 0) {
    return (
      <span
        className={`inline-block relative flex-shrink-0${highlight ? " ring-2 ring-yellow-400 ring-offset-1" : ""}`}
        style={{ width: outerW, height: outerH }}
      >
        <span
          className="absolute"
          style={{ ...spriteStyle, ...rotateStyle }}
          title={tile}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-block select-none flex-shrink-0${highlight ? " ring-2 ring-yellow-400 ring-offset-1" : ""}`}
      style={spriteStyle}
      title={tile}
    />
  );
}
