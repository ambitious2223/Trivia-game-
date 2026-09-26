// ArabicUtils.js

/**
 * Normalize Arabic text for answer comparison.
 * - strips tashkeel / tatweel / zero-width marks
 * - unifies hamza + alef forms, teh marbuta, alef maksura
 * - removes punctuation, emoji and other symbols (chat is messy)
 * - collapses whitespace
 */
export const normalizeArabic = (text) => {
  if (text == null) return "";
  return String(text)
    // Tashkeel, tatweel, Quranic marks, superscript alef
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    // Zero-width / bidi control characters
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    // Normalize Alif / Hamza forms
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    // Drop anything that is not a letter, number or space (punctuation, emoji, ...)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert Arabic-Indic / Persian digits to Western digits so parseInt works. */
export const toWesternDigits = (text) => {
  if (text == null) return "";
  return String(text).replace(/[٠-٩۰-۹]/g, (d) => {
    const indic = ARABIC_INDIC_DIGITS.indexOf(d);
    if (indic >= 0) return String(indic);
    return String(EXTENDED_ARABIC_INDIC_DIGITS.indexOf(d));
  });
};

/**
 * Resolve a viewer's raw chat message to the index of the choice it points to.
 *
 * Handles:
 *  - the choice number as shown on screen (respects `shuffleMap`)
 *  - the exact choice text (with tolerant Arabic normalization)
 *  - the choice text with extra words ("الجواب القلب") or punctuation/emoji
 *
 * Returns the index into `choices` (original, un-shuffled order) or null.
 */
export const resolveAnswerIndex = (rawAnswer, choices = [], shuffleMap = null) => {
  if (rawAnswer == null) return null;
  const list = Array.isArray(choices) ? choices : [];
  if (!list.length) return null;

  const useMap = Array.isArray(shuffleMap) && shuffleMap.length === list.length;
  const toOriginalIndex = (displayIdx) => (useMap ? shuffleMap[displayIdx] : displayIdx);

  const displayChoices = useMap ? shuffleMap.map((i) => list[i]) : list;
  const normDisplayChoices = displayChoices.map((c) => normalizeArabic(c));

  const cleaned = normalizeArabic(rawAnswer);
  if (!cleaned) return null;

  // 1) Exact choice text match
  const exactIdx = normDisplayChoices.findIndex((c) => c && c === cleaned);
  if (exactIdx >= 0) return toOriginalIndex(exactIdx);

  // 2) Choice text contained in the message (viewer added words / emoji)
  let bestDisplayIdx = -1;
  let bestLen = 0;
  normDisplayChoices.forEach((c, displayIdx) => {
    if (c && c.length >= 3 && cleaned.includes(c) && c.length > bestLen) {
      bestLen = c.length;
      bestDisplayIdx = displayIdx;
    }
  });
  if (bestDisplayIdx >= 0) return toOriginalIndex(bestDisplayIdx);

  // 3) Numeric answer: a lone digit (optionally with a short label like "الجواب 2")
  const western = toWesternDigits(cleaned);
  const tokens = western.split(" ").filter(Boolean);
  const digitTokens = tokens.filter((t) => /^[1-9]$/.test(t));
  if (digitTokens.length === 1 && tokens.length <= 2) {
    const num = Number(digitTokens[0]);
    if (num >= 1 && num <= list.length) return toOriginalIndex(num - 1);
  }

  return null;
};

/**
 * Index of the correct choice inside `question.choices`, tolerant to
 * whitespace / diacritic differences between `question.a` and the choice text.
 * Returns -1 when the answer is not present in the choices.
 */
export const getCorrectChoiceIndex = (question) => {
  const choices = Array.isArray(question?.choices) ? question.choices : [];
  if (!choices.length) return -1;
  const target = normalizeArabic(question?.a ?? "");
  if (target) {
    const idx = choices.findIndex((c) => normalizeArabic(c) === target);
    if (idx >= 0) return idx;
  }
  return choices.indexOf(question?.a);
};

/**
 * Single source of truth for "did this player answer correctly?".
 * Works for text answers, option numbers (shuffle-aware) and questions whose
 * answer string is missing from the choices (falls back to text compare).
 */
export const isPlayerAnswerCorrect = (rawAnswer, question, shuffleMap = null) => {
  const choices = Array.isArray(question?.choices) ? question.choices : [];
  const correctIndex = getCorrectChoiceIndex(question);
  if (correctIndex < 0) {
    return normalizeArabic(rawAnswer) === normalizeArabic(question?.a ?? "");
  }
  return resolveAnswerIndex(rawAnswer, choices, shuffleMap) === correctIndex;
};

export const calculateSpeedBonus = (timeLeft, totalTime) => {
  const ratio = timeLeft / totalTime;
  if (ratio > 0.8) return 2; // 2x points if answered in first 20% of time
  if (ratio > 0.5) return 1.5;
  return 1;
};