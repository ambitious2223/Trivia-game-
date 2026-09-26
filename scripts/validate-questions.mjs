#!/usr/bin/env node
/**
 * Validate the trivia bank after content updates.
 * Usage: npm run validate:questions
 */
import { auditQuestionBank, LADDER_DIFFICULTIES } from "../src/utils/QuestionManager.js";

const report = auditQuestionBank();
const blocking = report.issues.filter((i) =>
  ["answer_not_in_choices", "bad_choices", "empty_question"].includes(i.type)
);
const warnings = report.issues.filter((i) => !blocking.includes(i));

console.log("=== Question bank audit ===");
console.log(`Sources:    ${report.sourceCount}`);
console.log(`Questions:  ${report.totalQuestions}`);
console.log(`Categories: ${report.categoryCount}`);
console.log(`Ladder:     ${LADDER_DIFFICULTIES.join(" → ")}`);
console.log("");

if (blocking.length) {
  console.log(`BLOCKING (${blocking.length}):`);
  for (const issue of blocking.slice(0, 40)) {
    console.log(" ", JSON.stringify(issue));
  }
  if (blocking.length > 40) console.log(`  …and ${blocking.length - 40} more`);
  console.log("");
}

const byType = {};
for (const issue of warnings) {
  byType[issue.type] = (byType[issue.type] || 0) + 1;
}
console.log("Warnings by type:");
for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

const thin = warnings.filter((i) => i.type === "thin_category");
const noCrazy = warnings.filter(
  (i) => i.type === "missing_difficulties" && i.missing?.includes("crazy")
);
console.log("");
console.log(`Thin categories (<15 Q): ${thin.length}`);
console.log(`Categories with no crazy: ${noCrazy.length}`);
if (noCrazy.length) {
  console.log(
    "  (Ladder steps 13–15 fall back to hard→medium — gameplay still works.)"
  );
}

console.log("");
if (blocking.length) {
  console.error("FAILED: fix blocking issues before shipping.");
  process.exit(1);
}
console.log("OK: no blocking bank issues. Voting categories are loadable.");
process.exit(0);
