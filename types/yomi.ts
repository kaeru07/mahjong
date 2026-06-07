// ─────────────────────────────────────────────
// 当たり牌読み（捨て牌読み練習）用の型定義
// ─────────────────────────────────────────────

export type SeatKey = "self" | "shimocha" | "toimen" | "kamicha";

// 捨て牌1枚
export interface YomiDiscard {
  tile: string;                 // "6索" など（伏せる場合も実体は保持する）
  type: "tedashi" | "tsumogiri"; // 手出し / ツモ切り
  isReachTile?: boolean;         // リーチ宣言牌か
  hiddenWinTile?: boolean;       // 当たり牌（ロンの放銃牌）= この牌を「？」で隠す
}

// 副露1つ
export interface YomiMeld {
  type: "chi" | "pon" | "kan" | "ankan" | "kakan";
  tiles: string[];
  called?: string;                                   // 鳴いた牌
  from?: "shimocha" | "toimen" | "kamicha";          // 誰から鳴いたか
}

// プレイヤー1人
export interface YomiPlayer {
  seat: SeatKey;     // 相対位置
  wind: string;      // 自風 "東"/"南"/"西"/"北"
  score: number;     // 持ち点
  discards: YomiDiscard[];
  melds?: YomiMeld[];
  reach?: boolean;   // リーチ済みか
}

// 局情報
export interface YomiRoundInfo {
  bakaze: string;    // 場風
  kyoku: number;     // 局
  honba: number;     // 本場
  kyotaku: number;   // 供託（リーチ棒本数）
  dora: string[];    // ドラ表示牌
  turn: number;      // 巡目
}

// 結果（和了情報）
export interface YomiResult {
  type: "ron" | "tsumo";
  winner: SeatKey;    // 和了者
  loser?: SeatKey;    // 放銃者（ロン時のみ）
  hiddenTile: string; // 当たり牌（正解牌）
  waits: string[];    // 待ち牌（複数）
  waitShape?: string; // 待ち形（リャンメン / カンチャン / シャンポン / 単騎 など）
  yaku: string[];     // 役
}

// 選択肢ごとの「なぜ違うか」
export interface YomiChoiceReason {
  tile: string;
  reason: string;
}

// 読み根拠（スジ / 現物 / 壁 / 字牌処理 / ワンチャンス / 対子落とし / リャンメン落とし 等）
export interface YomiReadingBasis {
  label: string;   // 根拠の種別（例: "無スジ" "スジ" "現物" "壁" "字牌処理" "対子落とし" "リャンメン落とし"）
  detail: string;  // その根拠の具体的な説明
}

// 設問
export interface YomiQuestionBody {
  text: string;                       // 設問文
  choices: string[];                  // 牌の選択肢（4〜8個・correctTile を含む）
  correctTile: string;                // 正解牌（= result.hiddenTile）
  explanation: string;                // 総合解説
  readingPoints: string[];            // 読み筋（箇条書き）
  difficulty: "easy" | "medium" | "hard";
  dangerLevel: number;                // 危険度（1〜5＝★の数）
  tags: string[];
  dangerReason?: string;              // なぜその牌が危険だったか
  readingBasis?: YomiReadingBasis[];  // 読み根拠（スジ/現物/壁/字牌処理/対子落とし/リャンメン落とし 等）
  choiceReasons?: YomiChoiceReason[]; // 他の選択肢がなぜ違うか
}

// 問題1問 = ロン/ツモされた直前場面
export interface YomiQuestion {
  id: string;
  roundInfo: YomiRoundInfo;
  players: YomiPlayer[];
  result: YomiResult;
  question: YomiQuestionBody;
}
