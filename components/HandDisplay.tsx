"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import TileDisplay from "./TileDisplay";

interface HandDisplayProps {
  hand: string[];
  tsumo?: string | null;
}

// スプライト牌のアスペクト比
const TILE_ASPECT = 69 / 50; // height / width
const TILE_GAP    = 2;        // 隣接牌間のgap(px)
const SEP_W       = 10;       // ツモ前のセパレータ幅(px)
const MAX_W       = 38;       // 牌の最大表示幅(px)
const MIN_W       = 16;       // 牌の最小表示幅(px)

function calcSize(containerW: number, handLen: number, hasTsumo: boolean): number {
  if (containerW <= 0 || handLen <= 0) return MAX_W;
  const slotCount  = handLen + (hasTsumo ? 1 : 0);
  const gapTotal   = (slotCount - 1) * TILE_GAP + (hasTsumo ? SEP_W : 0);
  const available  = containerW - gapTotal;
  return Math.min(MAX_W, Math.max(MIN_W, Math.floor(available / slotCount)));
}

export default function HandDisplay({ hand, tsumo }: HandDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileW, setTileW]  = useState<number>(MAX_W);

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setTileW(calcSize(el.clientWidth, hand.length, !!tsumo));
  }, [hand.length, tsumo]);

  useEffect(() => {
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [update]);

  const tileH = Math.round(tileW * TILE_ASPECT);

  return (
    <div className="mb-3">
      <div className="text-xs text-gray-500 mb-1">手牌</div>
      <div
        ref={containerRef}
        className="flex flex-nowrap items-end overflow-hidden"
        style={{ gap: TILE_GAP }}
      >
        {hand.map((tile, i) => (
          <TileDisplay key={i} tile={tile} tileSize={tileW} />
        ))}

        {tsumo && (
          <>
            {/* セパレータ */}
            <span
              className="flex-shrink-0 text-gray-300 self-end font-light"
              style={{
                width: SEP_W,
                textAlign: "center",
                lineHeight: `${tileH}px`,
                fontSize: tileH * 0.6,
              }}
            >
              |
            </span>
            <TileDisplay tile={tsumo} tileSize={tileW} highlight />
          </>
        )}
      </div>
    </div>
  );
}
