import { Question, PlayerInfo, Meld, Discard } from "@/types/question";
import TileDisplay from "./TileDisplay";
import HandDisplay from "./HandDisplay";

interface BoardViewProps {
  q: Question;
}

// ─────────────────────────────────────
// 定数
// ─────────────────────────────────────
const MELD_TYPE: Record<string, string> = {
  chi: "チー", pon: "ポン", kan: "カン", ankan: "暗カン", kakan: "加カン",
};
const FROM_LABEL: Record<string, string> = {
  shimocha: "下", toimen: "対", kamicha: "上",
};

// ─────────────────────────────────────
// 内部ヘルパー
// ─────────────────────────────────────
function hasContent(p: PlayerInfo | undefined): boolean {
  if (!p) return false;
  return (
    (p.hand     !== undefined && p.hand.length     > 0) ||
    (p.discards !== undefined && p.discards.length > 0) ||
    (p.melds    !== undefined && p.melds.length    > 0)
  );
}

function riichiTileIndex(p: PlayerInfo | undefined): number | undefined {
  if (!p?.riichi || !p.discards) return undefined;
  const idx = [...p.discards].reverse().findIndex((d) => d.type === "tedashi");
  return idx >= 0 ? p.discards.length - 1 - idx : undefined;
}

// ─────────────────────────────────────
// 捨て牌コンポーネント（インライン）
// ─────────────────────────────────────
interface DiscardsProps {
  discards: Discard[];
  tileSize: number;
  maxTiles?: number;   // 最大表示枚数
  riichi?: boolean;
  riichiIndex?: number;
  /** 横並び折り返しなし（上家・下家用） */
  vertical?: boolean;
}

function Discards({ discards, tileSize, maxTiles, riichi, riichiIndex, vertical }: DiscardsProps) {
  if (!discards || discards.length === 0) return null;
  const tiles = maxTiles ? discards.slice(0, maxTiles) : discards;
  const ROW = 6;
  const rows: Discard[][] = [];
  for (let i = 0; i < tiles.length; i += ROW) rows.push(tiles.slice(i, i + ROW));

  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex flex-nowrap gap-px items-end">
          {row.map((d, ci) => {
            const idx = ri * ROW + ci;
            const isRiichi = riichi && riichiIndex !== undefined && idx === riichiIndex;
            return (
              <span key={ci} className={isRiichi ? "ring-1 ring-red-400 rounded" : ""}>
                <TileDisplay
                  tile={d.tile}
                  tileSize={tileSize}
                  dimmed={d.type === "tsumogiri"}
                />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────
// 副露コンポーネント（インライン）
// ─────────────────────────────────────
interface MeldsProps {
  melds: Meld[];
  tileSize: number;
}

function Melds({ melds, tileSize }: MeldsProps) {
  if (!melds || melds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {melds.map((m, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-px bg-green-900/60 border border-green-700 rounded px-1 py-0.5"
        >
          <span className="text-[9px] text-green-300 mr-0.5 flex-shrink-0">
            {MELD_TYPE[m.type] ?? m.type}
            {m.from && (
              <span className="text-green-400 ml-0.5">
                ({FROM_LABEL[m.from] ?? m.from})
              </span>
            )}
          </span>
          {m.tiles.map((t, j) => (
            <TileDisplay
              key={j}
              tile={t}
              tileSize={tileSize}
              highlight={t === m.called}
            />
          ))}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────
// 中央情報パネル
// ─────────────────────────────────────
function CenterPanel({ q }: { q: Question }) {
  const sit = q.situation;
  if (!sit) return <div className="w-20" />;

  const hasDora = (sit.dora?.length ?? 0) > 0;

  return (
    <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 bg-green-950/60 rounded-lg px-1 py-2 text-center">
      {/* 局 */}
      {sit.round?.kyoku && (
        <div className="text-xs font-bold text-yellow-300 leading-tight">
          {sit.round.kyoku}
        </div>
      )}
      {/* 本場・供託 */}
      {(sit.round?.honba !== undefined && sit.round.honba > 0) && (
        <div className="text-[10px] text-green-300">{sit.round.honba}本場</div>
      )}
      {(sit.round?.kyotaku !== undefined && sit.round.kyotaku > 0) && (
        <div className="text-[10px] text-green-300">供託{sit.round.kyotaku}</div>
      )}
      {/* ドラ */}
      {hasDora && (
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-[9px] text-green-400">ドラ</div>
          <div className="flex flex-wrap justify-center gap-px">
            {sit.dora!.map((d, i) => (
              <TileDisplay key={i} tile={d} tileSize={16} />
            ))}
          </div>
        </div>
      )}
      {/* 点数 */}
      {sit.scores && (
        <div className="flex flex-col items-start gap-0.5 text-[9px] text-green-300 mt-0.5">
          {(["self", "shimocha", "toimen", "kamicha"] as const).map((k) => {
            const v = sit.scores?.[k];
            if (v === undefined) return null;
            const lbl = k === "self" ? "自" : k === "shimocha" ? "下" : k === "toimen" ? "対" : "上";
            return (
              <div key={k} className="whitespace-nowrap">
                <span className="text-green-500">{lbl}:</span>
                <span className="text-green-200 font-medium ml-0.5">{(v / 100).toFixed(0)}k</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────
// 他家ゾーン（上 or 左右）
// ─────────────────────────────────────
interface PlayerZoneProps {
  p: PlayerInfo | undefined;
  label: string;
  tileSize?: number;
  maxTiles?: number;
  /** 横並び配置（上家・下家） */
  horizontal?: boolean;
}

function PlayerZone({ p, label, tileSize = 16, maxTiles = 18, horizontal }: PlayerZoneProps) {
  const hasDis  = (p?.discards?.length ?? 0) > 0;
  const hasMeld = (p?.melds?.length    ?? 0) > 0;
  const riichi  = p?.riichi;
  const ri      = riichiTileIndex(p);

  if (!hasDis && !hasMeld) {
    return (
      <div className="flex items-center justify-center text-[10px] text-green-600 min-h-8 min-w-8">
        {label}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0.5 ${horizontal ? "items-start" : "items-center"}`}>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-green-500">{label}</span>
        {riichi && (
          <span className="text-[8px] font-bold text-red-400 bg-red-950/60 border border-red-700 rounded px-0.5">
            R
          </span>
        )}
      </div>
      {hasDis && (
        <Discards
          discards={p!.discards!}
          tileSize={tileSize}
          maxTiles={maxTiles}
          riichi={riichi}
          riichiIndex={ri}
        />
      )}
      {hasMeld && <Melds melds={p!.melds!} tileSize={tileSize} />}
    </div>
  );
}

// ─────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────
export default function BoardView({ q }: BoardViewProps) {
  const sit = q.situation;
  if (!sit) return null;

  const selfPlayer  = sit.players?.self;
  const toimen      = sit.players?.toimen;
  const kamicha     = sit.players?.kamicha;
  const shimocha    = sit.players?.shimocha;

  const hasHand     = (selfPlayer?.hand?.length ?? 0) > 0;
  const hasSelfDis  = (selfPlayer?.discards?.length ?? 0) > 0;
  const hasSelfMeld = (selfPlayer?.melds?.length ?? 0) > 0;

  const hasAnyBoard =
    hasHand || hasSelfDis || hasSelfMeld ||
    hasContent(toimen) || hasContent(kamicha) || hasContent(shimocha) ||
    !!sit.round || (sit.dora?.length ?? 0) > 0 || !!sit.scores;

  if (!hasAnyBoard) return null;

  return (
    <div className="bg-green-800 rounded-xl border border-green-900 shadow-lg p-2 mb-4 select-none">

      {/* ── 対面ゾーン（上段） ── */}
      {hasContent(toimen) && (
        <div className="flex justify-center mb-2 pb-2 border-b border-green-700/50">
          <PlayerZone p={toimen} label="対面" tileSize={16} maxTiles={18} />
        </div>
      )}

      {/* ── 中段: 上家 ／ 中央情報 ／ 下家 ── */}
      <div className="flex items-stretch gap-2 mb-2">
        {/* 上家（左側） */}
        <div className="flex-1 flex items-center justify-end pr-1">
          {hasContent(kamicha) ? (
            <PlayerZone p={kamicha} label="上家" tileSize={16} maxTiles={12} horizontal />
          ) : (
            <div className="text-[10px] text-green-700">上家</div>
          )}
        </div>

        {/* 中央情報パネル */}
        <CenterPanel q={q} />

        {/* 下家（右側） */}
        <div className="flex-1 flex items-center justify-start pl-1">
          {hasContent(shimocha) ? (
            <PlayerZone p={shimocha} label="下家" tileSize={16} maxTiles={12} horizontal />
          ) : (
            <div className="text-[10px] text-green-700">下家</div>
          )}
        </div>
      </div>

      {/* ── 自分の河 ── */}
      {hasSelfDis && (
        <div className="border-t border-green-700/50 pt-2 mb-2">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[9px] text-green-500">自分の捨て牌</span>
            {selfPlayer?.riichi && (
              <span className="text-[8px] font-bold text-red-400 bg-red-950/60 border border-red-700 rounded px-0.5">
                リーチ
              </span>
            )}
          </div>
          <Discards
            discards={selfPlayer!.discards!}
            tileSize={20}
            riichi={selfPlayer?.riichi}
            riichiIndex={riichiTileIndex(selfPlayer)}
          />
        </div>
      )}

      {/* ── 自分の手牌エリア ── */}
      {(hasHand || hasSelfMeld) && (
        <div className="bg-green-900/60 rounded-lg p-2 border-t border-green-700/50">
          {hasHand && (
            <HandDisplay
              hand={selfPlayer!.hand!}
              tsumo={selfPlayer?.tsumo ?? undefined}
              hideLabel
            />
          )}
          {hasSelfMeld && (
            <div className="mt-1">
              <span className="text-[9px] text-green-500 mr-1">副露</span>
              <Melds melds={selfPlayer!.melds!} tileSize={22} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
