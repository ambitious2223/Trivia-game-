/**
 * Regression: viewer answers must resolve to the correct choice.
 * Covers Arabic normalization, punctuation/emoji, Arabic-Indic digits,
 * "label + number" messages and shuffled answer order.
 */
import assert from "node:assert/strict";
import { normalizeArabic, resolveAnswerIndex, isPlayerAnswerCorrect } from "../src/utils/ArabicUtils.js";

let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(" ", err.message);
    failed += 1;
  }
};

// --- Normalization ---
check("normalizes alif/hamza/teh-marbuta/alef-maksura", () => {
  assert.equal(normalizeArabic("الأسد"), normalizeArabic("الاسد"));
  assert.equal(normalizeArabic("الحمامة البيضاء"), normalizeArabic("الحمامه البيضاء"));
  assert.equal(normalizeArabic("مصطفى"), normalizeArabic("مصطفي"));
});

check("strips tashkeel, punctuation and emoji", () => {
  assert.equal(normalizeArabic("الْقَلْب"), "القلب");
  assert.equal(normalizeArabic("1."), "1");
  assert.equal(normalizeArabic("1) 👍"), "1");
});

// --- Text answers ---
const choices = ["الرئتان", "الكبد", "الدماغ", "القلب"];

check("exact choice text resolves", () => {
  assert.equal(resolveAnswerIndex("القلب", choices), 3);
});

check("choice text with punctuation/emoji resolves", () => {
  assert.equal(resolveAnswerIndex("القلب. 👍", choices), 3);
  assert.equal(resolveAnswerIndex("الدماغ!", choices), 2);
});

check("choice text with extra words resolves", () => {
  assert.equal(resolveAnswerIndex("الجواب القلب", choices), 3);
});

check("unrelated chatter is not an answer", () => {
  assert.equal(resolveAnswerIndex("مرحبا كيف الحال", choices), null);
  assert.equal(resolveAnswerIndex("", choices), null);
});

// --- Numeric answers ---
check("bare and formatted numbers resolve", () => {
  assert.equal(resolveAnswerIndex("1", choices), 0);
  assert.equal(resolveAnswerIndex("4.", choices), 3);
  assert.equal(resolveAnswerIndex("١", choices), 0); // Arabic-Indic
  assert.equal(resolveAnswerIndex("٢)", choices), 1);
});

check("label + number resolves", () => {
  assert.equal(resolveAnswerIndex("الجواب 3", choices), 2);
});

check("out-of-range number is not an answer", () => {
  assert.equal(resolveAnswerIndex("9", choices), null);
});

// --- Shuffle awareness ---
const shuffleMap = [2, 0, 3, 1]; // display order -> original index: [C, A, D, B]
const shuffledChoices = ["A", "B", "C", "D"];

check("number maps through shuffle to original index", () => {
  assert.equal(resolveAnswerIndex("1", shuffledChoices, shuffleMap), 2); // display 1 = C
  assert.equal(resolveAnswerIndex("3", shuffledChoices, shuffleMap), 3); // display 3 = D
});

check("text resolves regardless of shuffle", () => {
  assert.equal(resolveAnswerIndex("C", shuffledChoices, shuffleMap), 2);
  assert.equal(resolveAnswerIndex("ب", shuffledChoices, shuffleMap), null); // Arabic letter ≠ "B"
});

// --- End-to-end scoring decision ---
const question = { a: "القلب", choices, };

check("text and number both score correct", () => {
  assert.equal(isPlayerAnswerCorrect("القلب", question), true);
  assert.equal(isPlayerAnswerCorrect("القلب. 👍", question), true);
  assert.equal(isPlayerAnswerCorrect("4", question), true);
  assert.equal(isPlayerAnswerCorrect("1", question), false); // الرئتان
});

check("scoring respects shuffle", () => {
  const shuffledQuestion = { a: "C", choices: shuffledChoices };
  // display order [C, A, D, B]: number 1 is the correct one
  assert.equal(isPlayerAnswerCorrect("1", shuffledQuestion, shuffleMap), true);
  assert.equal(isPlayerAnswerCorrect("2", shuffledQuestion, shuffleMap), false);
  assert.equal(isPlayerAnswerCorrect("C", shuffledQuestion, shuffleMap), true);
});

check("answer text not exactly in choices falls back to text compare", () => {
  const odd = { a: "الصواب", choices: ["خطأ", "غلط"] };
  assert.equal(isPlayerAnswerCorrect("الصواب", odd), true);
  assert.equal(isPlayerAnswerCorrect("خطأ", odd), false);
});

if (failed > 0) {
  console.error(`\n${failed} answer-matching test(s) failed`);
  process.exit(1);
}
console.log("\nAll answer-matching tests passed");
