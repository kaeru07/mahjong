import { YomiQuestion, YomiPlayer, YomiDiscard, YomiMeld } from "@/types/yomi";
import { SEAT_LABEL, MELD_TYPE_LABEL, FROM_LABEL } from "@/lib/yomi";
import TileDisplay from "./TileDisplay";

interface YomiBoardViewProps {
  q: YomiQuestion;
  revealed: boolean;
}

// 捨て牌1枚を表示（手出し/ツモ切り/リーチ宣言牌/当たり牌の伏せ）
function DiscardTile({
  d,
  revealed,
}: {
  d: YomiDiscard;
  revealed: boolean;
}) {
  const isTsumogiri = d.type === "tsumogiri";
  const hideWin = d.hiddenWinTile && !revealed;

  // 当たり牌（伏せ中）→ 「？」表示
  if (hideWin) {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0 rounded border-2 border-amber-400 bg-amber-100 font-bold text-amber-700"
        style={{ width: 22, height: 30, fontSize: 16 }}
        title="当たり牌（？）"
      >
        ？
      </span>
    );
  }

  const isAnswerRevealed = d.hiddenWinTile && revealed;

  return (
    <span
      className={`relative inline-block flex-shrink-0 ${
        d.isReachTile ? "ring-1 ring-red-400 rounded" : ""
      } ${isAnswerRevealed ? "ring-2 ring-amber-500 rounded" : ""}`}
    >
      <TileDisplay tile={d.tile} tileSize={22} dimmed={isTsumogiri} />
      {isTsumogiri && (
        <span
          className="absolute bottom-0.5 right-0.5 rounded-full bg-sky-400 pointer-events-none"
          style={{ width: 4, height: 4 }}
        />
      )}
    </span>
  );
}

// 捨て牌の河（1行6枚で折り返し）
function River({ discards, revealed }: { discards: YomiDiscard[]; revealed: boolean }) {
  const CHUNK = 6;
  const chunks: YomiDiscard[][] = [];
  for (let i = 0; i < discards.length; i += CHUNK) chunks.push(discards.slice(i, i + CHUNK));
  return (
    <div className="flex flex-col gap-0.5">
      {chunks.map((chunk, ci) => (
        <div key={ci} className="flex flex-nowrap gap-px">
          {chunk.map((d, di) => (
            <DiscardTile key={di} d={d} revealed={revealed} />
          ))}
        </div>
      ))}
    </div>
  );
}

// 副露
function Melds({ melds }: { melds: YomiMeld[] }) {
  if (!melds || melds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {melds.map((m, i) => (
        <span
          key={i}
          className="inline-flex flex-wrap items-center gap-px bg-green-900/60 border border-green-700 rounded px-1 py-0.5"
        >
          <span className="text-[9px] text-green-300 flex-shrink-0">
            {MELD_TYPE_LABEL[m.type] ?? m.type}
            {m.from && <span className="text-green-400 ml-0.5">({FROM_LABEL[m.from] ?? m.from})</span>}
          </span>
          {m.tiles.map((t, j) => (
            <TileDisplay key={j} tile={t} tileSize={18} highlight={t === m.called} />
          ))}
        </span>
      ))}
    </div>
  );
}

// プレイヤー1人のゾーン
function PlayerZone({
  p,
  q,
  revealed,
}: {
  p: YomiPlayer;
  q: YomiQuestion;
  revealed: boolean;
}) {
  const isWinner = q.result.winner === p.seat;
  const isLoser = q.result.loser === p.seat;

  return (
    <div className="rounded-lg bg-green-800/80 border border-green-900 p-2">
      {/* ラベル行 */}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="text-[11px] font-bold text-yellow-200 bg-green-950/70 rounded px-1.5 py-0.5">
          {p.wind}家
        </span>
        <span className="text-[11px] text-green-200">{SEAT_LABEL[p.seat]}</span>
        <span className="text-[10px] text-green-300">{p.score.toLocaleString()}点</span>
        {p.reach && (
          <span className="text-[9px] font-bold text-red-300 bg-red-950/70 border border-red-600 rounded px-1">
            リーチ
          </span>
        )}
        {isWinner && (
          <span className="text-[9px] font-bold text-amber-900 bg-amber-300 rounded px-1">
            和了
          </span>
        )}
        {isLoser && (
          <span className="text-[9px] font-bold text-white bg-red-600 rounded px-1">放銃</span>
        )}
      </div>

      {/* 副露 */}
      <Melds melds={p.melds ?? []} />

      {/* 河 */}
      <div className="mt-1">
        <River discards={p.discards} revealed={revealed} />
      </div>
    </div>
  );
}

export default function YomiBoardView({ q, revealed }: YomiBoardViewProps) {
  const { roundInfo, result } = q;
  // 表示順: 対面 → 上家 → 下家 → 自分（卓の見た目に近い縦並び）
  const order: YomiQuestion["players"] = ["toimen", "kamicha", "shimocha", "self"]
    .map((s) => q.players.find((p) => p.seat === s))
    .filter((p): p is YomiPlayer => !!p);

  return (
    <div className="bg-green-700 rounded-xl border border-green-900 shadow-lg p-2 mb-4 select-none">
      {/* ── 局情報バー ── */}
      <div className="flex items-center justify-between flex-wrap gap-1 bg-green-950/60 rounded-lg px-2 py-1.5 mb-2">
        <div className="flex items-center gap-2 text-[11px] text-green-100">
          <span className="font-bold text-yellow-300">
            {roundInfo.bakaze}
            {roundInfo.kyoku}局
          </span>
          {roundInfo.honba > 0 && <span>{roundInfo.honba}本場</span>}
          {roundInfo.kyotaku > 0 && <span>供託{roundInfo.kyotaku}</span>}
          <span className="text-green-300">{roundInfo.turn}巡目</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-green-400">ドラ</span>
          {roundInfo.dora.map((t, i) => (
            <TileDisplay key={i} tile={t} tileSize={18} />
          ))}
        </div>
      </div>

      {/* ── 当たり牌（？/正解） ── */}
      <div className="flex items-center justify-center gap-2 bg-amber-950/50 border border-amber-600/50 rounded-lg px-2 py-1.5 mb-2">
        <span className="text-[11px] font-bold text-amber-200">
          {result.type === "ron" ? "ロン" : "ツモ"}和了 ／ 当たり牌
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
            <TileDisplay tile={result.hiddenTile} tileSize={26} />
          </span>
        )}
      </div>

      {/* ── 4人分の河 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {order.map((p) => (
          <PlayerZone key={p.seat} p={p} q={q} revealed={revealed} />
        ))}
      </div>

      {/* ── 凡例 ── */}
      <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-green-200">
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
          <span className="inline-block w-2.5 h-3.5 bg-white border-2 border-red-400 rounded-sm" />
          リーチ宣言
        </span>
      </div>
    </div>
  );
}
