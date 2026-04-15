// 選択肢
export interface Choice {
  key: string;   // "A", "B", ...
  label: string; // "8萬を切って押す"
}

// 捨て牌1枚
export interface Discard {
  tile: string;
  type: "tedashi" | "tsumogiri";
  turn?: number;
}

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
  seat?: string;      // 座席風牌 "東" "南" etc.
  hand?: string[];    // 手牌
  tsumo?: string;     // ツモ牌
  discards?: Discard[];
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
  kyoku?: string;   // "東1局" etc.
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
  situation?: Situation;
}
