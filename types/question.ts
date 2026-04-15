// 選択肢
export interface Choice {
  key: string;   // "A", "B", ...
  label: string; // "8萬を切って押す"
}

// 捨て牌1枚
export interface DiscardItem {
  tile: string;
  type: "tedashi" | "tsumogiri";
  turn: number;               // 何巡目に捨てたか（プレイヤー自身の巡目）
  riichiDeclaration?: boolean; // リーチ宣言牌かどうか
}

/** @deprecated Use DiscardItem */
export type Discard = DiscardItem;

// 副露1つ
export interface Meld {
  type: "chi" | "pon" | "kan" | "ankan" | "kakan";
  tiles: string[];
  called?: string;
  from?: "self" | "shimocha" | "toimen" | "kamicha";
  turn?: number;
}

// プレイヤー情報
export interface PlayerInfo {
  seat?: string;           // 座席風牌 "東" "南" etc.
  hand?: string[];         // 手牌
  tsumo?: string;          // ツモ牌
  discards?: DiscardItem[];
  melds?: Meld[];
  riichi?: boolean;
}

// プレイヤー集合
export interface Players {
  self?: PlayerInfo;
  shimocha?: PlayerInfo;
  toimen?: PlayerInfo;
  kamicha?: PlayerInfo;
}

// 局情報
export interface Round {
  bakaze?: string;  // 場風 "東" "南" etc.
  kyoku?: number;   // 局数 1-4
  honba?: number;   // 本場
  kyotaku?: number; // 供託
}

// 点数情報
export interface Scores {
  self?: number;
  shimocha?: number;
  toimen?: number;
  kamicha?: number;
}

// 麻雀状況（すべて任意）
export interface Situation {
  round?: Round;
  dora?: string[];
  turn?: number;    // 巡目
  scores?: Scores;
  players?: Players;
}

// 問題データ
export interface Question {
  // 必須
  id: string;
  title: string;
  question: string;
  choices: Choice[];
  answer: string;      // choices[n].key と一致
  explanation: string;

  // 任意
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard";
  book?: string;       // 出典（書籍名など）
  chapter?: string;    // 章
  sourcePage?: number; // ページ番号
  situation?: Situation;
}
