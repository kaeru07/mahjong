import { YomiQuestion, YomiPlayer, YomiDiscard, YomiMeld, SeatKey } from "@/types/yomi";
import { SEAT_LABEL, MELD_TYPE_LABEL, FROM_LABEL } from "@/lib/yomi";
import TileDisplay, { Rotation } from "./TileDisplay";

interface YomiBoardViewProps {
  q: YomiQuestion;
  revealed: boolean;
}

// 席ごとの牌の回転角度（雀魂風: 対面=上/上家=左/下家=右/自分=下）
const SEAT_ROT: Record<SeatKey, Rotation> = {
  self: 0,
  toimen: 180,
  kamicha: 270,
  shimocha: 90,
};

// 上家・下家は縦レイアウト（河を列方向に積む）
const SEAT_VERT: Record<SeatKey, boolean> = {
  self: false,
  toimen: false,
  kamicha: true,
  shimocha: true,
};

// 席ごとの牌サイズ（スマホ最優先で自分を大きく）
const SEAT_TILE: Record<SeatKey, number> = {
  self: 17,
  toimen: 13,
  kamicha: 12,
  shimocha: 12,
};

// ─────────────────────────────────────
// 捨て牌1枚
// ─────────────────────────────────────
function DiscardTile({
  d,
  rotation,
  tileSize,
  revealed,
}: {
  d: YomiDiscard;
  rotation: Rotation;
  tileSize: number;
  revealed: boolean;
}) {
  const hideWin = d.hiddenWinTile && !revealed;
  const isTsumogiri = d.type === "tsumogiri";
  const isAnswerRevealed = d.hiddenWinTile && revealed;

  // 当たり牌（伏せ中）→ 牌枠を保った「？」
  if (hideWin) {
    return <TileDisplay tile="" placeholder="？" tileSize={tileSize} rotation={rotation} />;
  }

  // リーチ宣言牌は横向き（90度回す）
  const rot: Rotation = d.isReachTile ? (((rotation + 90) % 360) as Rotation) : rotation;

  return (
    <span
      className={`relative inline-block flex-shrink-0 ${
        isAnswerRevealed ? "ring-2 ring-amber-500 rounded" : ""
      }`}
    >
      <TileDisplay tile={d.tile} tileSize={tileSize} dimmed={isTsumogiri} rotation={rot} />
      {isTsumogiri && (
        <span
          className="absolute bottom-0.5 right-0.5 rounded-full bg-sky-400 pointer-events-none"
          style={{ width: 4, height: 4 }}
        />
      )}
    </span>
  );
}

// ─────────────────────────────────────
// 河（6枚で折返し）
// ─────────────────────────────────────
function River({
  discards,
  rotation,
  tileSize,
  vertical,
  revealed,
}: {
  discards: YomiDiscard[];
  rotation: Rotation;
  tileSize: number;
  vertical: boolean;
  revealed: boolean;
}) {
  if (!discards || discards.length === 0) return null;
  const CHUNK = 6;
  const chunks: YomiDiscard[][] = [];
  for (let i = 0; i < discards.length; i += CHUNK) chunks.push(discards.slice(i, i + CHUNK));

  if (vertical) {
    // 縦配置: chunk を横に並べ、各 chunk は縦積み。下家(90度)は最新chunkが中央寄りになるよう逆順
    const displayChunks = rotation === 90 ? [...chunks].reverse() : chunks;
    return (
      <div className="flex flex-row gap-0.5">
        {displayChunks.map((chunk, ci) => (
          <div key={ci} className="flex flex-col gap-px">
            {chunk.map((d, di) => (
              <DiscardTile key={di} d={d} rotation={rotation} tileSize={tileSize} revealed={revealed} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // 横配置: chunk を縦に積み、各 chunk は横並び
  return (
    <div className="flex flex-col gap-0.5 items-center">
      {chunks.map((chunk, ci) => (
        <div key={ci} className="flex flex-nowrap gap-px items-center">
          {chunk.map((d, di) => (
            <DiscardTile key={di} d={d} rotation={rotation} tileSize={tileSize} revealed={revealed} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────
// 副露（プレイヤー横に表示）
// ─────────────────────────────────────
function Melds({ melds, vertical }: { melds: YomiMeld[]; vertical: boolean }) {
  if (!melds || melds.length === 0) return null;
  return (
    <div className={`flex ${vertical ? "flex-col" : "flex-wrap"} gap-1`}>
      {melds.map((m, i) => (
        <span
          key={i}
          className="inline-flex flex-wrap items-center gap-px bg-green-950/70 border border-green-600 rounded px-1 py-0.5"
        >
          <span className="text-[8px] text-green-300 flex-shrink-0 leading-none">
            {MELD_TYPE_LABEL[m.type] ?? m.type}
            {m.from && <span className="text-green-400">({FROM_LABEL[m.from] ?? m.from})</span>}
          </span>
          {m.tiles.map((t, j) => (
            <TileDisplay key={j} tile={t} tileSize={13} highlight={t === m.called} />
          ))}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────
// プレイヤーゾーン（ラベル + 副露 + 河）
// ─────────────────────────────────────
function PlayerZone({
  p,
  q,
  revealed,
  align = "center",
}: {
  p: YomiPlayer;
  q: YomiQuestion;
  revealed: boolean;
  align?: "center" | "start" | "end";
}) {
  const rotation = SEAT_ROT[p.seat];
  const vertical = SEAT_VERT[p.seat];
  const tileSize = SEAT_TILE[p.seat];
  const isWinner = q.result.winner === p.seat;
  const isLoser = q.result.loser === p.seat;

  const alignCls =
    align === "start" ? "items-start" : align === "end" ? "items-end" : "items-center";

  return (
    <div className={`flex flex-col ${alignCls} gap-0.5`}>
      {/* ラベル */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <span className="text-[10px] font-bold text-yellow-200 bg-green-950/80 rounded px-1 leading-tight">
          {p.wind}
        </span>
        <span className="text-[9px] text-green-100">{SEAT_LABEL[p.seat]}</span>
        <span className="text-[9px] text-green-300">{(p.score / 1000).toFixed(0)}k</span>
        {p.reach && (
          <span className="text-[8px] font-bold text-red-200 bg-red-900/80 border border-red-500 rounded px-0.5 leading-tight">
            リーチ
          </span>
        )}
        {isWinner && (
          <span className="text-[8px] font-bold text-amber-900 bg-amber-300 rounded px-0.5 leading-tight">
            和了
          </span>
        )}
        {isLoser && (
          <span className="text-[8px] font-bold text-white bg-red-600 rounded px-0.5 leading-tight">
            放銃
          </span>
        )}
      </div>

      {/* 副露 */}
      <Melds melds={p.melds ?? []} vertical={vertical} />

      {/* 河 */}
      <River
        discards={p.discards}
        rotation={rotation}
        tileSize={tileSize}
        vertical={vertical}
        revealed={revealed}
      />
    </div>
  );
}

// ─────────────────────────────────────
// 中央パネル（局・巡目・ドラ）
// ─────────────────────────────────────
function CenterPanel({ q }: { q: YomiQuestion }) {
  const { roundInfo } = q;
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-green-950/70 rounded-lg px-1.5 py-2 min-w-[56px]">
      <div className="text-[11px] font-bold text-yellow-300 leading-tight text-center">
        {roundInfo.bakaze}
        {roundInfo.kyoku}局
      </div>
      {roundInfo.honba > 0 && <div className="text-[9px] text-green-300">{roundInfo.honba}本場</div>}
      {roundInfo.kyotaku > 0 && (
        <div className="text-[9px] text-green-300">供託{roundInfo.kyotaku}</div>
      )}
      <div className="text-[9px] text-green-200">{roundInfo.turn}巡目</div>
      <div className="flex flex-col items-center gap-0.5">
        <div className="text-[8px] text-green-400">ドラ</div>
        <div className="flex flex-wrap justify-center gap-px">
          {roundInfo.dora.map((t, i) => (
            <TileDisplay key={i} tile={t} tileSize={15} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// メイン
// ─────────────────────────────────────
export default function YomiBoardView({ q, revealed }: YomiBoardViewProps) {
  const bySeat = (s: SeatKey) => q.players.find((p) => p.seat === s);
  const toimen = bySeat("toimen");
  const kamicha = bySeat("kamicha");
  const shimocha = bySeat("shimocha");
  const self = bySeat("self");

  return (
    <div className="bg-green-700 rounded-xl border border-green-900 shadow-lg p-2 mb-4 select-none">
      {/* ── 当たり牌（？ / 正解） ── */}
      <div className="flex items-center justify-center gap-2 bg-amber-950/50 border border-amber-600/50 rounded-lg px-2 py-1.5 mb-2">
        <span className="text-[11px] font-bold text-amber-200">
          {q.result.type === "ron" ? "ロン" : "ツモ"}和了 ／ 当たり牌
        </span>
        {!revealed ? (
          <span
            className="inline-flex items-center justify-center rounded border-2 border-amber-400 bg-amber-100 font-bold text-amber-700"
            style={{ width: 26, height: 34, fontSize: 18 }}
          >
            ？
          </span>
        ) : (
          <span className="inline-block ring-2 ring-amber-400 rounded">
            <TileDisplay tile={q.result.hiddenTile} tileSize={26} />
          </span>
        )}
      </div>

      {/* ── 麻雀卓 ── */}
      <div className="bg-green-800 rounded-xl border border-green-900 p-2">
        {/* 対面（上） */}
        <div className="flex justify-center mb-1.5 pb-1.5 border-b border-green-700/40">
          {toimen && <PlayerZone p={toimen} q={q} revealed={revealed} />}
        </div>

        {/* 中段: 上家（左） / 中央 / 下家（右） */}
        <div className="flex items-stretch justify-between gap-1 mb-1.5">
          <div className="flex items-center justify-start">
            {kamicha && <PlayerZone p={kamicha} q={q} revealed={revealed} align="start" />}
          </div>
          <div className="flex items-center">
            <CenterPanel q={q} />
          </div>
          <div className="flex items-center justify-end">
            {shimocha && <PlayerZone p={shimocha} q={q} revealed={revealed} align="end" />}
          </div>
        </div>

        {/* 自分（下） */}
        <div className="flex justify-center pt-1.5 border-t border-green-700/40">
          {self && <PlayerZone p={self} q={q} revealed={revealed} />}
        </div>
      </div>

      {/* ── 凡例 ── */}
      <div className="flex items-center justify-center flex-wrap gap-3 mt-2 text-[9px] text-green-100">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-3.5 bg-white border border-gray-400 rounded-sm" />
          手出し
        </span>
        <span className="flex items-center gap-1">
          <span className="relative inline-block w-2.5 h-3.5 bg-white/40 border border-gray-400 rounded-sm">
            <span className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-sky-400" />
          </span>
          ツモ切り
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3.5 h-2.5 bg-white border-2 border-red-400 rounded-sm" />
          リーチ宣言(横向き)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-2.5 h-3.5 bg-amber-100 border-2 border-amber-400 rounded-sm text-amber-700 text-[7px] font-bold">
            ?
          </span>
          当たり牌
        </span>
      </div>
    </div>
  );
}
