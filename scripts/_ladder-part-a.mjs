import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../src/questions/ladderFill.js');

function q(category, question, answer, choices, difficulty) {
  const points = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 200;
  if (!choices.includes(answer)) {
    throw new Error(`Answer "${answer}" not in choices for: ${question}`);
  }
  return { category, q: question, a: answer, choices, difficulty, points, power: false };
}

function batch(category, rows) {
  return rows.map(([question, answer, choices, difficulty]) =>
    q(category, question, answer, choices, difficulty)
  );
}

// ─── ALL question data as arrays ───────────────────────────────────────────
