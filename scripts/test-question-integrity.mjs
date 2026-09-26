/**
 * Question-bank integrity: the board is a fixed 2×2 grid, so every playable
 * question must have exactly 4 non-empty choices. Guards against stale/malformed
 * data ever reaching the board.
 */
import assert from "node:assert/strict";
import {
  TRIVIA_QUESTIONS,
  isPlayableQuestion,
  sanitizeQuestionList,
  REQUIRED_CHOICES,
} from "../src/utils/QuestionManager.js";

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

check("REQUIRED_CHOICES is 4", () => {
  assert.equal(REQUIRED_CHOICES, 4);
});

check("every bank question has exactly 4 choices", () => {
  const bad = TRIVIA_QUESTIONS.filter((q) => !Array.isArray(q.choices) || q.choices.length !== 4);
  assert.equal(bad.length, 0, bad.slice(0, 3).map((q) => q.q).join(" | "));
});

check("every bank question is playable", () => {
  const bad = TRIVIA_QUESTIONS.filter((q) => !isPlayableQuestion(q));
  assert.equal(bad.length, 0, bad.slice(0, 3).map((q) => q.q).join(" | "));
});

check("sanitizeQuestionList drops malformed questions", () => {
  const list = [
    { q: "ok", a: "1", choices: ["1", "2", "3", "4"] },
    { q: "three", a: "1", choices: ["1", "2", "3"] },
    { q: "five", a: "1", choices: ["1", "2", "3", "4", "5"] },
    { q: "empty-choice", a: "1", choices: ["1", "", "3", "4"] },
    { q: "two", a: "1", choices: ["1", "2"] },
    { q: "no-answer", a: "", choices: ["1", "2", "3", "4"] },
    { q: "", a: "1", choices: ["1", "2", "3", "4"] },
    null,
  ];
  const out = sanitizeQuestionList(list);
  assert.equal(out.length, 1);
  assert.equal(out[0].q, "ok");
});

check("sanitizeQuestionList tolerates a non-array", () => {
  assert.deepEqual(sanitizeQuestionList(null), []);
  assert.deepEqual(sanitizeQuestionList(undefined), []);
});

if (failed > 0) {
  console.error(`\n${failed} question-integrity test(s) failed`);
  process.exit(1);
}
console.log("\nAll question-integrity tests passed");
