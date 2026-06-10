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

// 取り込み元メタ情報（牌譜由来の問題に付与・任意）
// 注意: 生牌譜・gameId 等「牌譜本体へのポインタ」は保持しない（再配布防止）。
// 保持するのは出典の「種別」だけ。
export interface YomiSource {
  sourceType?: string;   // 出典プラットフォーム: "tenhou" / "majsoul" など
  sourceRank?: string;   // 出典の卓・段位帯: "houou"(鳳凰卓) / "konten"(魂天) / "ouza"(王座の間) / "tokujou"(特上卓) など
  importedAt?: string;   // 取り込み日時（ISO）
}

// 取り込み品質ランク（採用=S/A・保留=B・隔離=C・破棄=D）
export type YomiQualityRank = "S" | "A" | "B" | "C" | "D";

// ─────────────────────────────────────────────
// 原本再現性の検証（sourceValidation）
//
// 目的: 「アプリが表示している問題」が「原本（牌譜JSON / 原本画像の書き起こし）」を
// 正しく再現しているかを項目ごとに突き合わせ、再現された項目・欠落/不一致の項目を
// 機械的に検出できるようにする。原本との差分をレビューせずに S/A 採用しないための土台。
// ─────────────────────────────────────────────

// 1項目の突き合わせ結果
//   match    = 原本とアプリ表示が一致
//   mismatch = 値が食い違う（例: 上家河 12枚 → 8枚 / 自風不一致）
//   missing  = 原本に存在する情報がアプリ表示で欠落（例: 下家鳴き欠落）
//   unknown  = 原本側に該当データが無く検証できない（一致率の分母に含めない）
export type FieldMatch = "match" | "mismatch" | "missing" | "unknown";

// 検証14項目のキー
export type SourceValidationField =
  | "playerSeats"   // プレイヤー位置
  | "selfWind"      // 自風
  | "bakaze"        // 場風
  | "riverCounts"   // 河枚数
  | "riverOrder"    // 河順序
  | "handCounts"    // 手牌枚数
  | "meldContent"   // 鳴き内容
  | "meldPosition"  // 鳴き位置
  | "dora"          // ドラ
  | "turn"          // 巡目
  | "scores"        // 点数
  | "reach"         // リーチ有無
  | "loser"         // 放銃者
  | "winner";       // 和了者

export interface SourceValidationCheck {
  field: SourceValidationField; // 検証項目キー
  label: string;                // 日本語ラベル（"プレイヤー位置" 等）
  result: FieldMatch;           // match / mismatch / missing / unknown
  original?: string;            // 原本側の値（要約文字列）
  rendered?: string;            // アプリ表示側の値（要約文字列）
  note?: string;                // 差分の説明（例: "上家河 12枚 → 8枚"）
}

// 検証ステータス
//   exact   = 検証可能な全項目が一致（matchRate=1・mismatch/missing なし）
//   partial = 一部のみ一致（mismatch か missing が混在）
//   failed  = 致命的項目（和了者/放銃者/正解牌など）が不一致、または一致率が閾値未満
export type SourceValidationStatus = "exact" | "partial" | "failed";

export interface SourceValidation {
  validatedAt: string;             // 検証日時（ISO）
  hasOriginal: boolean;            // 原本（JSON/画像）があったか
  originalKind?: "json" | "image" | "none"; // 原本の種別
  status: SourceValidationStatus;  // exact / partial / failed
  matchRate: number;               // 一致率 0..1（matchedCount / checkedCount）
  checkedCount: number;            // 検証できた項目数（unknown を除く）
  matchedCount: number;            // 一致した項目数
  checks: SourceValidationCheck[]; // 14項目の内訳
  diffSummary?: string[];          // 差分レポート（例: ["上家河 12枚 → 8枚", "下家鳴き欠落", "自風不一致"]）
  reviewedBy?: string;             // 原本差分を確認した主体（"claude" / "human" 等）。S/A採用の前提
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
  source?: YomiSource;                // 牌譜由来の取り込み元（任意）
  qualityRank?: YomiQualityRank;      // 取り込み品質ランク（任意）
  sourceValidation?: SourceValidation; // 原本との再現性検証（任意・原本がある場合に付与）
}

// 問題1問 = ロン/ツモされた直前場面
export interface YomiQuestion {
  id: string;
  roundInfo: YomiRoundInfo;
  players: YomiPlayer[];
  result: YomiResult;
  question: YomiQuestionBody;
}
