// src/utils/QuestionManager.js
// Central question bank: register new category files in QUESTION_SOURCES only.

import { scienceQuestions } from "../questions/science.js";
import { accentQuestions } from "../questions/accents.js";
import { prophetsQuestions } from "../questions/prophets.js";
import { trendingQuestions } from "../questions/trending.js";
import { animeQuestions } from "../questions/anime.js";
import { flagsQuestions } from "../questions/flags.js";
import { anatomyQuestions } from "../questions/anatomy.js";
import { empiresAndWarsQuestions } from "../questions/empiresAndWars.js";
import { footballQuestions } from "../questions/football.js";
import { gamingTechQuestions } from "../questions/gamingTech.js";
import { geographyCapitalsQuestions } from "../questions/geographyCapitals.js";
import { heritageAndFashionQuestions } from "../questions/heritageAndFashion.js";
import { islamicHistoryQuestions } from "../questions/islamicHistory.js";
import { musicAndSingingQuestions } from "../questions/musicAndSinging.js";
import { mythsAndLegendsQuestions } from "../questions/mythsAndLegends.js";
import { physicsQuestions } from "../questions/physics.js";
import { poetryAndLiteratureQuestions } from "../questions/poetryAndLiterature.js";
import { proverbsQuestions } from "../questions/proverbs.js";
import { arabCuisineQuestions } from "../questions/arabCuisine.js";
import { riddlesQuestions } from "../questions/riddles.js";
import { scientistsInventionsQuestions } from "../questions/scientistsInventions.js";
import { spaceAstronomyQuestions } from "../questions/spaceAstronomy.js";
import { animalWorldQuestions } from "../questions/animalWorld.js";
import { arabLandmarksQuestions } from "../questions/arabLandmarks.js";
import { automotiveQuestions } from "../questions/automotive.js";
import { biologyQuestions } from "../questions/biology.js";
import { cartoonsQuestions } from "../questions/cartoons.js";
import { chemistryQuestions } from "../questions/chemistry.js";
import { cinemaAndTheaterQuestions } from "../questions/cinemaAndTheater.js";
import { mathematicsQuestions } from "../questions/mathematics.js";
import { psychologyQuestions } from "../questions/psychology.js";
import { philosophyQuestions } from "../questions/philosophy.js";
import { economicsQuestions } from "../questions/economics.js";
import { dailyLifePuzzlesQuestions } from "../questions/dailyLifePuzzles.js";
import { ladderFillQuestions } from "../questions/ladderFill.js";

/** Ladder difficulties used by useQuestionBank (steps 1–15). */
export const LADDER_DIFFICULTIES = ["easy", "medium", "hard", "crazy"];

/** Classic flat scoring — difficulty decides points. Never above MAX. */
export const MAX_QUESTION_POINTS = 200;
export const DIFFICULTY_POINTS = {
  easy: 50,
  medium: 100,
  hard: 200,
  crazy: 200,
};

export function getPointsForDifficulty(difficulty) {
  const key = normalizeDifficulty(difficulty);
  const pts = DIFFICULTY_POINTS[key] ?? DIFFICULTY_POINTS.easy;
  return Math.min(MAX_QUESTION_POINTS, pts);
}

/** Force classic scoring onto any question object (kills stale millionaire values). */
export function applyClassicPoints(question) {
  if (!question || typeof question !== "object") return question;
  const difficulty = normalizeDifficulty(question.difficulty);
  return {
    ...question,
    difficulty,
    points: getPointsForDifficulty(difficulty),
  };
}

/** Map free-form difficulty strings → ladder keys. */
const DIFFICULTY_ALIASES = {
  "super easy": "easy",
  supereasy: "easy",
  super_easy: "easy",
  "very easy": "easy",
  "very hard": "crazy",
  extreme: "crazy",
  expert: "crazy",
};

/**
 * Add a new category file here when updating the bank.
 * `id` is for tooling; `questions` is the exported array.
 */
export const QUESTION_SOURCES = [
  { id: "science", questions: scienceQuestions },
  { id: "accents", questions: accentQuestions },
  { id: "prophets", questions: prophetsQuestions },
  { id: "trending", questions: trendingQuestions },
  { id: "anime", questions: animeQuestions },
  { id: "flags", questions: flagsQuestions },
  { id: "anatomy", questions: anatomyQuestions },
  { id: "empiresAndWars", questions: empiresAndWarsQuestions },
  { id: "football", questions: footballQuestions },
  { id: "gamingTech", questions: gamingTechQuestions },
  { id: "geographyCapitals", questions: geographyCapitalsQuestions },
  { id: "heritageAndFashion", questions: heritageAndFashionQuestions },
  { id: "islamicHistory", questions: islamicHistoryQuestions },
  { id: "musicAndSinging", questions: musicAndSingingQuestions },
  { id: "mythsAndLegends", questions: mythsAndLegendsQuestions },
  { id: "physics", questions: physicsQuestions },
  { id: "poetryAndLiterature", questions: poetryAndLiteratureQuestions },
  { id: "proverbs", questions: proverbsQuestions },
  { id: "arabCuisine", questions: arabCuisineQuestions },
  { id: "riddles", questions: riddlesQuestions },
  { id: "scientistsInventions", questions: scientistsInventionsQuestions },
  { id: "spaceAstronomy", questions: spaceAstronomyQuestions },
  { id: "animalWorld", questions: animalWorldQuestions },
  { id: "arabLandmarks", questions: arabLandmarksQuestions },
  { id: "automotive", questions: automotiveQuestions },
  { id: "biology", questions: biologyQuestions },
  { id: "cartoons", questions: cartoonsQuestions },
  { id: "chemistry", questions: chemistryQuestions },
  { id: "cinemaAndTheater", questions: cinemaAndTheaterQuestions },
  { id: "mathematics", questions: mathematicsQuestions },
  { id: "psychology", questions: psychologyQuestions },
  { id: "philosophy", questions: philosophyQuestions },
  { id: "economics", questions: economicsQuestions },
  { id: "dailyLifePuzzles", questions: dailyLifePuzzlesQuestions },
  { id: "ladderFill", questions: ladderFillQuestions },
];

export function normalizeDifficulty(raw) {
  if (raw == null || raw === "") return "easy";
  const key = String(raw).trim().toLowerCase();
  return DIFFICULTY_ALIASES[key] || key;
}

function normalizeQuestion(q, index) {
  const category = String(q.category || "").trim();
  const difficulty = normalizeDifficulty(q.difficulty);
  const choices = Array.isArray(q.choices) ? q.choices.map((c) => String(c)) : [];
  return {
    ...q,
    category,
    difficulty,
    points: getPointsForDifficulty(difficulty), // always ≤ MAX_QUESTION_POINTS
    choices,
    a: q.a != null ? String(q.a) : "",
    q: q.q != null ? String(q.q) : "",
    id: q.id || `q-${index}`,
  };
}

const DIFFICULTY_RANK = { easy: 1, medium: 2, hard: 3, crazy: 4 };

function buildTriviaQuestions() {
  const byText = new Map();
  for (const source of QUESTION_SOURCES) {
    const list = source.questions || [];
    for (const item of list) {
      if (!item?.q) continue;
      const prev = byText.get(item.q);
      if (!prev) {
        byText.set(item.q, item);
        continue;
      }
      // Prefer higher ladder difficulty on duplicate text (fills hard/crazy gaps).
      const prevRank = DIFFICULTY_RANK[normalizeDifficulty(prev.difficulty)] || 0;
      const nextRank = DIFFICULTY_RANK[normalizeDifficulty(item.difficulty)] || 0;
      if (nextRank >= prevRank) byText.set(item.q, item);
    }
  }
  return Array.from(byText.values()).map((q, i) => normalizeQuestion(q, i));
}

export const TRIVIA_QUESTIONS = buildTriviaQuestions();

export const getQuestionsByCategory = (categoryName) => {
  return TRIVIA_QUESTIONS.filter((q) => q.category === categoryName);
};

/** Sorted unique category names — used by the voting screen. */
export const getAllCategories = () => {
  const categories = new Set(TRIVIA_QUESTIONS.map((q) => q.category).filter(Boolean));
  return Array.from(categories).sort((a, b) => a.localeCompare(b, "ar"));
};

/**
 * Lightweight bank health report for scripts / DebugMenu.
 * Does not throw — callers decide severity.
 */
export function auditQuestionBank() {
  const issues = [];
  const byCat = new Map();

  for (const q of TRIVIA_QUESTIONS) {
    if (!byCat.has(q.category)) {
      byCat.set(q.category, { easy: 0, medium: 0, hard: 0, crazy: 0, other: 0, total: 0 });
    }
    const bucket = byCat.get(q.category);
    bucket.total += 1;
    if (LADDER_DIFFICULTIES.includes(q.difficulty)) bucket[q.difficulty] += 1;
    else bucket.other += 1;

    if (!q.q?.trim()) {
      issues.push({ type: "empty_question", id: q.id, category: q.category });
    }
    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      issues.push({ type: "bad_choices", id: q.id, category: q.category });
    } else if (q.a && !q.choices.includes(q.a)) {
      issues.push({
        type: "answer_not_in_choices",
        id: q.id,
        category: q.category,
        a: q.a,
        choices: q.choices,
      });
    }
    if (!LADDER_DIFFICULTIES.includes(q.difficulty)) {
      issues.push({
        type: "non_ladder_difficulty",
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
      });
    }
  }

  const categories = [];
  for (const [name, counts] of byCat) {
    const missingLadder = LADDER_DIFFICULTIES.filter((d) => counts[d] === 0);
    if (counts.total < 15) {
      issues.push({ type: "thin_category", category: name, total: counts.total });
    }
    if (missingLadder.length) {
      issues.push({
        type: "missing_difficulties",
        category: name,
        missing: missingLadder,
        counts,
      });
    }
    categories.push({ name, ...counts });
  }

  return {
    totalQuestions: TRIVIA_QUESTIONS.length,
    sourceCount: QUESTION_SOURCES.length,
    categoryCount: categories.length,
    categories: categories.sort((a, b) => a.name.localeCompare(b.name, "ar")),
    issues,
  };
}
