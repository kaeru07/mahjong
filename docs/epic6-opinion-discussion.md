# Epic6 意見・議論機能 設計書（麻雀問題アプリ）

> 何切る/鳴き読み問題に対して、ユーザーとAIが「意見・反対意見・賛成反対」を交わせる議論機能。
> 学習体験の深化（正解の暗記でなく思考過程の共有）と、コメント蓄積による回遊・滞在時間増を狙う。
> 本書は設計のみ。実装は未着手（DB/型/UIモック/コメント構造/AI意見/賛成反対/収益化案）。

---

## 0. ゴールと非ゴール

- ゴール: 各問題の詳細画面で「人間コメント＋AI意見＋AI反対意見」を表示し、賛成/反対投票で集合知を可視化する。
- 非ゴール（本Epicでは扱わない）: リアルタイムチャット、ユーザー間DM、画像投稿、通報の自動BAN（手動運用から）。
- 前提: 現行はローカルJSON（`data/questions.json`）＋静的Next.js。議論機能は**書き込みが発生する**ため、初めて永続バックエンド（DB）が必要になる。導入可否・コストは「§9 確認が必要な選択肢」に集約。

---

## 1. データベース設計（案）

候補: **Supabase(Postgres)** を第一候補（無料枠・Auth・RLS・Edge Functions が揃う）。代替は SQLite/Turso、PlanetScale 等（§9）。

```
-- 問題（questions.json のミラー or 参照キーのみ）
problems            (本体はJSONのまま。DBは question_id を外部キーとして参照)

-- コメント（人間 + AI 共通テーブル。author_type で区別）
comments
  id              uuid pk
  question_id     text        -- 'q011' 等（questions.json の id）
  parent_id       uuid null   -- 返信ツリー（null=ルート）
  author_type     enum('user','ai_opinion','ai_counter')  -- AI意見/AI反対意見も同テーブル
  author_id       uuid null   -- user の場合 auth.users.id、AIはnull
  display_name    text        -- 表示名（AIは「AIの見解」「AIの反対意見」）
  stance          enum('agree','disagree','neutral') null  -- この問題の打牌に賛成/反対/中立
  body            text        -- 本文（Markdown軽量サブセット）
  agree_count     int default 0   -- 集計列（投票から非正規化）
  disagree_count  int default 0
  status          enum('visible','hidden','flagged') default 'visible'
  created_at      timestamptz default now()
  updated_at      timestamptz

-- コメントへの賛成反対投票（1ユーザー1コメント1票）
comment_votes
  id            uuid pk
  comment_id    uuid fk -> comments.id
  user_id       uuid fk -> auth.users.id
  vote          enum('agree','disagree')
  created_at    timestamptz
  unique(comment_id, user_id)

-- 問題そのものへの「あなたはこの打牌に賛成?反対?」投票（コメントと独立）
problem_votes
  id            uuid pk
  question_id   text
  user_id       uuid fk
  vote          enum('agree','disagree')   -- 模範解答の打牌に対する賛否
  created_at    timestamptz
  unique(question_id, user_id)

-- AI生成意見のキャッシュ（再生成コスト削減・確定運用）
ai_opinions
  id            uuid pk
  question_id   text unique
  opinion_body  text     -- AIの見解（模範解答を補強/敷衍）
  counter_body  text     -- AIの反対意見（あえて別ルートを擁護）
  model         text     -- 生成モデル
  generated_at  timestamptz
  needs_review  bool default true   -- 既存 needsReview 運用と接続（人間確認前）
```

**RLS方針（Supabase）**: `comments` は read 全員 / insert 本人(`author_type='user'` かつ `author_id=auth.uid()`) / update・delete 本人のみ。`*_votes` は本人行のみ。AI行（ai_opinion/ai_counter）はサービスロール(Edge Function)のみ insert。

**集計の非正規化**: `comments.agree_count/disagree_count` はトリガ or Edge Function で `comment_votes` から更新（読み取り高速化）。

---

## 2. 型定義（TypeScript / types/discussion.ts 案）

```ts
export type AuthorType = 'user' | 'ai_opinion' | 'ai_counter';
export type Stance = 'agree' | 'disagree' | 'neutral';
export type VoteValue = 'agree' | 'disagree';
export type CommentStatus = 'visible' | 'hidden' | 'flagged';

export interface Comment {
  id: string;
  questionId: string;        // 'q011'
  parentId: string | null;
  authorType: AuthorType;
  authorId: string | null;
  displayName: string;
  stance: Stance | null;
  body: string;
  agreeCount: number;
  disagreeCount: number;
  status: CommentStatus;
  createdAt: string;
  myVote?: VoteValue | null; // ログインユーザーの投票（クライアント結合）
  replies?: Comment[];       // ツリー化後
}

export interface ProblemVoteSummary {
  questionId: string;
  agree: number;
  disagree: number;
  myVote: VoteValue | null;
}

export interface AiOpinion {
  questionId: string;
  opinion: string;   // AIの見解（模範解答側）
  counter: string;   // AIの反対意見
  model: string;
  generatedAt: string;
  needsReview: boolean;
}

// API I/O
export interface PostCommentInput {
  questionId: string;
  parentId?: string | null;
  stance?: Stance;
  body: string;
}
```

---

## 3. UIモック（問題詳細画面 /questions/[id] 新設 or quiz 解答後に展開）

```
┌─ 問題詳細 q013 ─────────────────────────┐
│ [卓ビュー: BoardView（手牌/ドラ/対面副露）]            │
│ 設問: 自分は2枚の筒のどちらを切る？                    │
│ 選択肢 A/B    あなたの解答: A   模範解答: A ✓          │
│ 解説: …（既存 explanation）            ⚠要確認バッジ    │
├─ この打牌、賛成？反対？ ───────────────┤
│   [👍 賛成 62%]  [👎 反対 38%]   ← problem_votes 集計   │
│   あなた: 未投票 → [賛成] [反対]                        │
├─ 🤖 AIの見解 ─────────────────────────┤
│  「捨て順から…放銃率が低い方を切るのが…」(ai_opinion)   │
├─ 🤖 AIの反対意見 ─────────────────────┤
│  「ただし相手が…の場合は逆の筒が…」(ai_counter)         │
│   [この反対意見に 👍 / 👎]                              │
├─ 💬 みんなの意見 (24) ──── 並び: 人気/新着 ───┤
│  ┌ user たろう  [賛成]  👍12 👎1                        │
│  │ 「タンヤオ維持より安全度を…」     [返信] [👍][👎]    │
│  │   └ user じろう [反対] 👍3                           │
│  │      「いや、打点を考えると…」                       │
│  └ ...                                                  │
│  [コメントを書く（賛成/反対/中立を選択）]  ※要ログイン   │
└─────────────────────────────────────┘
```

iPhone優先: 縦1カラム・カードUI・横スクロールなし。AI意見/反対意見は色分け（見解=青系／反対=橙系）。賛否バーは割合表示。

---

## 4. 問題詳細画面（ルーティング・データ取得）

- ルート: `/questions/[id]`（新設）。既存 `/questions` 一覧の各カードから遷移、`/result` の各問題からも遷移。
- 取得: `getAllQuestions()` から該当 `Question`（静的）＋ `comments`/`votes`/`ai_opinions`（DBから fetch、クライアント or RSC）。
- 既存 quiz/result は不変（追加導線のみ。BoardView を再利用）。

---

## 5. コメント構造（ツリー / 並び替え / 投稿）

- 2階層まで（ルート＋返信1段）でモバイル可読性を優先。深いネストは折りたたみ。
- 並び: 人気順（`agree_count - disagree_count`）/ 新着順。
- 投稿: ログイン必須（Supabase Auth: メール/匿名/OAuth）。`stance`（賛成/反対/中立）必須選択 → 集合知の可視化に使う。
- モデレーション: `status` で hidden/flagged。初期は手動運用＋NGワード簡易フィルタ。

---

## 6. AI意見 / AI反対意見（生成と運用）

- **AI意見(ai_opinion)**: 模範解答(explanation)を敷衍し、初心者にも分かる根拠を提示。
- **AI反対意見(ai_counter)**: あえて別ルート（例: 打点重視・別の待ち想定）を擁護し、思考の幅を広げる。「正解の暗記」を防ぐのが狙い。
- 生成: Edge Function で Claude/GPT に「問題JSON＋explanation」を渡し2本生成 → `ai_opinions` にキャッシュ。**`needs_review=true` で保存し、人間確認後に公開**（既存の needsReview 運用と接続）。
- コスト管理: 1問1回生成してキャッシュ（再生成は手動トリガのみ）。API課金は§9で要承認。
- 既存 `needsReview` 問題（牌姿が推定の26問）は、AI意見生成前に牌姿確定を推奨（誤った前提で意見生成しないため）。

---

## 7. 賛成反対（2系統）

1. **問題への賛否**(`problem_votes`): 「模範解答の打牌に賛成/反対」→ 割合バー表示。集合知。
2. **コメント/AI反対意見への賛否**(`comment_votes`): 各意見の支持度。人気順ソートに利用。

いずれも1ユーザー1対象1票（unique制約）。未ログインは閲覧のみ・投票/投稿不可。

---

## 8. 収益化案

- **広告**: 詳細画面・コメント一覧に控えめなネイティブ広告（AdMob/AdSense）。回遊増＝表示増。
- **プレミアム（サブスク）**: ①AI反対意見のフル表示（無料は要約のみ）②全問題の解説＋AI意見アーカイブ閲覧③広告非表示④「自分専用AIに質問」(問題について追加質問)。月額 300〜500円想定。
- **コメントのプレミアム機能**: 画像/牌姿引用つき投稿、上位者バッジ。
- **段階導入**: まず広告のみ→コメント/AI意見の利用が定着したらサブスク。課金・本番AdMob・支払いは**ユーザー作業**（既存ルール: external_publish/billing は別Epic・承認必須）。
- **データ資産**: 蓄積コメント/賛否は「人間の打牌判断データ」として、将来の問題改善・難易度調整・別プロダクトに再利用可能。

---

## 9. 確認が必要な選択肢（人間判断・本Epicでは実装しない）

1. **バックエンド採用**: Supabase / Turso / その他。→ 認証・本番DB・コストに関わるため要承認（DBスキーマ変更＝確認対象）。
2. **AI生成のAPI課金**: どのモデル・月予算上限。→ APIキー/課金は要承認。
3. **認証方式**: 匿名許可 or メール/OAuth必須。
4. **モデレーション方針**: 事前審査 or 事後対応。
5. **サブスク価格・無料/有料の線引き**。
6. **公開範囲**: 全問題で議論を開く or 人気問題のみ先行。

## 10. 段階実装プラン（承認後）

- Phase1: 読み取り専用（AI意見/反対意見をキャッシュ表示、コメントは静的シード）。DB無しでも一部可。
- Phase2: コメント投稿＋投票（Supabase導入・Auth・RLS）。
- Phase3: AI意見の自動生成パイプライン（Edge Function＋needsReview運用）。
- Phase4: サブスク・広告最適化。

> 注: 本機能は「書き込み・認証・課金・本番DB・API課金」を伴い、現行の静的アプリから構成が変わる。実装着手は §9 の承認後。
