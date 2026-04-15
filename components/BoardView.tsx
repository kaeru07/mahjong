import { Question, PlayerInfo, Meld, Discard } from "@/types/question";
import TileDisplay, { Rotation } from "./TileDisplay";
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

// 卓上の位置別回転角度
const ROTATION: Record<"toimen" | "kamicha" | "shimocha" | "self", Rotation> = {
  toimen:   180,
  kamicha:   90,
  shimocha: 270,
  self:       0,
};

// ─────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────
function riichiTileIndex(p: PlayerInfo | undefined): number | undefined {
  if (!p?.riichi || !p.discards) return undefined;
  const idx = [...p.discards].reverse().findIndex((d) => d.type === "tedashi");
  return idx >= 0 ? p.discards.length - 1 - idx : undefined;
}

/** 手牌情報がないときに表示する裏牌枚数（副露分を引く） */
function backTileCount(p: PlayerInfo | undefined): number {
  const meldTiles = (p?.melds ?? []).reduce((acc, m) => {
    return acc + (m.type === "kan" || m.type === "ankan" ? 4 : 3);
  }, 0);
  return Math.max(0, 13 - meldTiles);
}

// ─────────────────────────────────────
// 捨て牌（inline）
// ─────────────────────────────────────
interface DiscardsProps {
  discards: Discard[];
  tileSize: number;
  maxTiles?: number;
  riichi?: boolean;
  riichiIndex?: number;
  rotation?: Rotation;
}

function Discards({
  discards, tileSize, maxTiles, riichi, riichiIndex, rotation = 0,
}: DiscardsProps) {
  if (!discards || discards.length === 0) return null;
  const tiles = maxTiles ? discards.slice(0, maxTiles) : discards;
  const ROW = 6;
  const rows: Discard[][] = [];
  for (let i = 0; i < tiles.length; i += ROW) rows.push(tiles.slice(i, i + ROW));

  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex flex-nowrap gap-px items-center">
          {row.map((d, ci) => {
            const idx = ri * ROW + ci;
            const isRiichi = riichi && riichiIndex !== undefined && idx === riichiIndex;
            return (
              <span key={ci} className={isRiichi ? "ring-1 ring-red-400 rounded" : ""}>
                <TileDisplay
                  tile={d.tile}
                  tileSize={tileSize}
                  dimmed={d.type === "tsumogiri"}
                  rotation={rotation}
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
// 副露（inline）
// ─────────────────────────────────────
interface MeldsProps {
  melds: Meld[];
  tileSize: number;
  rotation?: Rotation;
}

function Melds({ melds, tileSize, rotation = 0 }: MeldsProps) {
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
              rotation={rotation}
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
  if (!sit) return <div className="w-20 flex-shrink-0" />;

  const hasDora = (sit.dora?.length ?? 0) > 0;

  return (
    <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 bg-green-950/60 rounded-lg px-1 py-2 text-center">
      {sit.round?.kyoku && (
        <div className="text-xs font-bold text-yellow-300 leading-tight">
          {sit.round.kyoku}
        </div>
      )}
      {(sit.round?.honba ?? 0) > 0 && (
        <div className="text-[10px] text-green-300">{sit.round!.honba}本場</div>
      )}
      {(sit.round?.kyotaku ?? 0) > 0 && (
        <div className="text-[10px] text-green-300">供託{sit.round!.kyotaku}</div>
      )}
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
      {sit.scores && (
        <div className="flex flex-col items-start gap-0.5 text-[9px] text-green-300 mt-0.5">
          {(["self", "shimocha", "toimen", "kamicha"] as const).map((k) => {
            const v = sit.scores?.[k];
            if (v === undefined) return null;
            const lbl = { self: "自", shimocha: "下", toimen: "対", kamicha: "上" }[k];
            return (
              <div key={k} className="whitespace-nowrap">
                <span className="text-green-500">{lbl}:</span>
                <span className="text-green-200 font-medium ml-0.5">
                  {(v / 100).toFixed(0)}k
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────
// 他家ゾーン
// ─────────────────────────────────────
interface PlayerZoneProps {
  p: PlayerInfo | undefined;
  label: string;
  rotation: Rotation;
  tileSize?: number;
  maxTiles?: number;
  maxBackTiles?: number;
}

function PlayerZone({
  p,
  label,
  rotation,
  tileSize = 15,
  maxTiles = 18,
  maxBackTiles = 13,
}: PlayerZoneProps) {
  const hasDis  = (p?.discards?.length ?? 0) > 0;
  const hasMeld = (p?.melds?.length    ?? 0) > 0;
  const hasHand = (p?.hand?.length     ?? 0) > 0;
  const riichi  = p?.riichi;
  const ri      = riichiTileIndex(p);

  // 手牌情報なし → 裏牌を表示
  const backCount = hasHand ? 0 : Math.min(maxBackTiles, backTileCount(p));

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* 裏牌 or 表牌の手牌エリア */}
      {(backCount > 0 || hasHand) && (
        <div className="flex flex-wrap gap-px justify-center">
          {hasHand
            ? p!.hand!.map((t, i) => (
                <TileDisplay key={i} tile={t} tileSize={tileSize} rotation={rotation} />
              ))
            : Array.from({ length: backCount }, (_, i) => (
                <TileDisplay key={i} tile="裏" faceDown tileSize={tileSize} rotation={rotation} />
              ))}
        </div>
      )}

      {/* ラベル + リーチ */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-green-500">{label}</span>
        {riichi && (
          <span className="text-[8px] font-bold text-red-400 bg-red-950/60 border border-red-700 rounded px-0.5">
            R
          </span>
        )}
      </div>

      {/* 捨て牌 */}
      {hasDis && (
        <Discards
          discards={p!.discards!}
          tileSize={tileSize}
          maxTiles={maxTiles}
          riichi={riichi}
          riichiIndex={ri}
          rotation={rotation}
        />
      )}

      {/* 副露 */}
      {hasMeld && <Melds melds={p!.melds!} tileSize={tileSize} rotation={rotation} />}
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

  // situation が存在すれば卓を表示
  const hasAnyBoard =
    hasHand || hasSelfDis || hasSelfMeld ||
    !!sit.round || (sit.dora?.length ?? 0) > 0 || !!sit.scores ||
    !!toimen || !!kamicha || !!shimocha;

  if (!hasAnyBoard) return null;

  return (
    <div className="bg-green-800 rounded-xl border border-green-900 shadow-lg p-2 mb-4 select-none">

      {/* ── 対面（上段） ── */}
      <div className="flex justify-center mb-2 pb-1.5 border-b border-green-700/40">
        <PlayerZone
          p={toimen}
          label="対面"
          rotation={ROTATION.toimen}
          tileSize={14}
          maxTiles={18}
          maxBackTiles={13}
        />
      </div>

      {/* ── 中段: 上家 ／ 中央情報 ／ 下家 ── */}
      <div className="flex items-stretch gap-1.5 mb-1.5">
        {/* 上家（左） */}
        <div className="flex-1 flex items-center justify-end">
          <PlayerZone
            p={kamicha}
            label="上家"
            rotation={ROTATION.kamicha}
            tileSize={13}
            maxTiles={12}
            maxBackTiles={7}
          />
        </div>

        {/* 中央パネル */}
        <CenterPanel q={q} />

        {/* 下家（右） */}
        <div className="flex-1 flex items-center justify-start">
          <PlayerZone
            p={shimocha}
            label="下家"
            rotation={ROTATION.shimocha}
            tileSize={13}
            maxTiles={12}
            maxBackTiles={7}
          />
        </div>
      </div>

      {/* ── 自分の河 ── */}
      {hasSelfDis && (
        <div className="border-t border-green-700/40 pt-1.5 mb-1.5">
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
            tileSize={18}
            riichi={selfPlayer?.riichi}
            riichiIndex={riichiTileIndex(selfPlayer)}
            rotation={0}
          />
        </div>
      )}

      {/* ── 自分の手牌エリア ── */}
      {(hasHand || hasSelfMeld) && (
        <div className="bg-green-900/60 rounded-lg p-2 border-t border-green-700/40">
          {hasHand && (
            <HandDisplay
              hand={selfPlayer!.hand!}
              tsumo={selfPlayer?.tsumo ?? undefined}
              hideLabel
            />
          )}
          {hasSelfMeld && (
            <div className="mt-1 flex items-center flex-wrap gap-1">
              <span className="text-[9px] text-green-500">副露</span>
              <Melds melds={selfPlayer!.melds!} tileSize={20} rotation={0} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
