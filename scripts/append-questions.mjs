/**
 * data/questions.json へ問題を追記する（重複チェック付き）
 *
 *   node scripts/append-questions.mjs <追加する問題のJSONファイル>
 *   node scripts/append-questions.mjs --dry-run <file>
 *
 * 重複判定:
 *   1. title の完全一致
 *   2. (book, chapter, drillNo) の一致 … notes に "drill:<章>-<番号>" を持たせる運用
 *   3. sourceImages の重なり
 * いずれかに当たったら skip し、理由を出す。
 *
 * id は既存の最大 qNNN の次から自動採番する。
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const inputPath = args.find((a) => !a.startsWith("--"));
if (!inputPath) {
  console.error("使い方: node scripts/append-questions.mjs [--dry-run] <file.json>");
  process.exit(1);
}

const QUESTIONS = "data/questions.json";
const existing = JSON.parse(readFileSync(QUESTIONS, "utf8"));
const incoming = JSON.parse(readFileSync(inputPath, "utf8"));
const list = Array.isArray(incoming) ? incoming : [incoming];

const VALID_DIFFICULTY = new Set(["easy", "medium", "hard"]);

function nextId(all) {
  let max = 0;
  for (const q of all) {
    const m = String(q.id ?? "").match(/^q(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `q${String(max + 1).padStart(3, "0")}`;
}

function drillKey(q) {
  const m = String(q.notes ?? "").match(/drill:([^\s/]+)/);
  return m ? `${q.book ?? ""}|${m[1]}` : null;
}

const titles = new Set(existing.map((q) => q.title));
const drills = new Set(existing.map(drillKey).filter(Boolean));
const images = new Set(existing.flatMap((q) => q.sourceImages ?? []));

function validate(q) {
  const errors = [];
  for (const f of ["title", "question", "explanation", "answer"]) {
    if (!q[f] || typeof q[f] !== "string" || !q[f].trim()) errors.push(`${f} が必須`);
  }
  if (!Array.isArray(q.choices) || q.choices.length < 2) {
    errors.push("choices は2要素以上");
  } else {
    q.choices.forEach((c, i) => {
      if (!c?.key?.trim()) errors.push(`choices[${i}].key が必要`);
      if (!c?.label?.trim()) errors.push(`choices[${i}].label が必要`);
    });
    if (q.answer && !q.choices.some((c) => c.key === q.answer)) {
      errors.push(`answer "${q.answer}" が choices の key に無い`);
    }
  }
  if (q.difficulty !== undefined && !VALID_DIFFICULTY.has(q.difficulty)) {
    errors.push(`difficulty が不正: ${q.difficulty}`);
  }
  return errors;
}

const added = [];
const skipped = [];
const failed = [];
const out = [...existing];

for (const q of list) {
  const errors = validate(q);
  if (errors.length) {
    failed.push({ title: q.title, errors });
    continue;
  }

  const dk = drillKey(q);
  const imgDup = (q.sourceImages ?? []).filter((i) => images.has(i));
  let reason = null;
  if (titles.has(q.title)) reason = `title重複: ${q.title}`;
  else if (dk && drills.has(dk)) reason = `同じドリル既出: ${dk}`;
  else if (imgDup.length) reason = `出典画像が既出: ${imgDup.join(",")}`;

  if (reason) {
    skipped.push({ title: q.title, reason });
    continue;
  }

  const withId = { ...q, id: q.id ?? nextId(out) };
  out.push(withId);
  titles.add(withId.title);
  if (dk) drills.add(dk);
  (withId.sourceImages ?? []).forEach((i) => images.add(i));
  added.push(withId.id + " " + withId.title);
}

console.log(`既存 ${existing.length} 件 / 入力 ${list.length} 件`);
console.log(`追加 ${added.length} 件:`);
added.forEach((a) => console.log("  + " + a));
if (skipped.length) {
  console.log(`重複skip ${skipped.length} 件:`);
  skipped.forEach((s) => console.log(`  - ${s.title} … ${s.reason}`));
}
if (failed.length) {
  console.log(`検証NG ${failed.length} 件:`);
  failed.forEach((f) => console.log(`  ! ${f.title}: ${f.errors.join(" / ")}`));
}

if (dryRun) {
  console.log("(dry-run のため書き込みなし)");
} else if (added.length) {
  writeFileSync(QUESTIONS, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`${QUESTIONS} を更新 (${out.length} 件)`);
}

if (failed.length) process.exitCode = 1;
