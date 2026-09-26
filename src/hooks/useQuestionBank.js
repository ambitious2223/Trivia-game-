// src/hooks/useQuestionBank.js
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TRIVIA_QUESTIONS,
  getQuestionsByCategory,
  applyClassicPoints,
  MAX_QUESTION_POINTS,
} from "../utils/QuestionManager.js";

export function shuffleArray(array) {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 15-question difficulty ramp (classic flat points).
 * Points come from difficulty only: easy 50 · medium 100 · hard 200 · crazy 200
 * Cap: MAX_QUESTION_POINTS (200) — never millionaire ladder values.
 */
export const ROUND_DIFFICULTY_STEPS = [
  { step: 1,  difficulty: "easy" },
  { step: 2,  difficulty: "easy" },
  { step: 3,  difficulty: "easy" },
  { step: 4,  difficulty: "easy" },
  { step: 5,  difficulty: "medium" },
  { step: 6,  difficulty: "medium" },
  { step: 7,  difficulty: "medium" },
  { step: 8,  difficulty: "medium" },
  { step: 9,  difficulty: "hard" },
  { step: 10, difficulty: "hard" },
  { step: 11, difficulty: "hard" },
  { step: 12, difficulty: "hard" },
  { step: 13, difficulty: "crazy" },
  { step: 14, difficulty: "crazy" },
  { step: 15, difficulty: "crazy" },
];

function pickForDifficulty(pools, difficulty, fullPool) {
  let qToAdd = pools[difficulty]?.pop();
  if (!qToAdd) {
    if (difficulty === "crazy") qToAdd = pools.hard?.pop();
    if (!qToAdd && (difficulty === "crazy" || difficulty === "hard")) qToAdd = pools.medium?.pop();
    if (!qToAdd) qToAdd = pools.easy?.pop();
  }
  if (!qToAdd && fullPool.length > 0) {
    qToAdd = fullPool[Math.floor(Math.random() * fullPool.length)];
  }
  return qToAdd;
}

function withRoundScoring(qToAdd, step) {
  return {
    ...applyClassicPoints(qToAdd),
    ladderStep: step,
  };
}

function loadSanitizedRoundFromStorage() {
  try {
    const saved = localStorage.getItem("trivia_custom_bank");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    // Drop any stale millionaire ladder (points over cap)
    const hasLegacyMillion = parsed.some((q) => Number(q?.points) > MAX_QUESTION_POINTS);
    if (hasLegacyMillion) {
      localStorage.removeItem("trivia_custom_bank");
      return [];
    }
    return parsed.map((q, i) => withRoundScoring(q, q.ladderStep || i + 1));
  } catch {
    localStorage.removeItem("trivia_custom_bank");
    return [];
  }
}

export function useQuestionBank(addToast) {
  const [usedQuestionIds, setUsedQuestionIds] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("trivia_used_questions") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  
  const [questionList, setQuestionList] = useState(() => loadSanitizedRoundFromStorage());

  const [qIdx, setQIdx] = useState(0);

  const [currentSpinCategory, setCurrentSpinCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Persist data (always re-clamp points so cache can never revive millionaire values)
  useEffect(() => { localStorage.setItem("trivia_used_questions", JSON.stringify(usedQuestionIds)); }, [usedQuestionIds]);
  useEffect(() => {
    const safe = (questionList || []).map((q, i) => withRoundScoring(q, q.ladderStep || i + 1));
    localStorage.setItem("trivia_custom_bank", JSON.stringify(safe));
  }, [questionList]);

  const rawQ = questionList[qIdx];
  // Re-derive the scored question only when the raw question changes
  const q = useMemo(() => (rawQ ? applyClassicPoints(rawQ) : rawQ), [rawQ]);
  const isCrazy = q?.difficulty === "crazy";

  const advanceToNextQuestion = useCallback(() => {
    if (q) setUsedQuestionIds(prev => [...prev, q.id || q.q]);

    if (qIdx < questionList.length - 1) {
      setQIdx(currentIdx => currentIdx + 1);
    }
  }, [q, qIdx, questionList]);

  const loadAndFilterQuestions = useCallback((category) => {
    const safeCategory = typeof category === "string" ? category : "mixed";

    const fullPool = (!safeCategory || safeCategory === "mixed") 
        ? TRIVIA_QUESTIONS 
        : getQuestionsByCategory(safeCategory);

    let filteredPool = fullPool.filter(qItem => !usedQuestionIds.includes(qItem.id || qItem.q));

    if (filteredPool.length < 15) {
      if (addToast) addToast(`♻️ مذهل! لقد رأيتم أغلب الأسئلة المتاحة. جاري تصفير الذاكرة!`, "warning");
      setUsedQuestionIds([]); 
      filteredPool = [...fullPool]; 
    }

    const pools = {
      easy: shuffleArray(filteredPool.filter(q => q.difficulty === "easy")),
      medium: shuffleArray(filteredPool.filter(q => q.difficulty === "medium")),
      hard: shuffleArray(filteredPool.filter(q => q.difficulty === "hard")),
      crazy: shuffleArray(filteredPool.filter(q => q.difficulty === "crazy")),
    };

    const runQuestions = [];

    ROUND_DIFFICULTY_STEPS.forEach(stepReq => {
      const qToAdd = pickForDifficulty(pools, stepReq.difficulty, fullPool);
      if (qToAdd) {
        runQuestions.push(withRoundScoring(qToAdd, stepReq.step));
      }
    });

    return runQuestions;
  }, [usedQuestionIds, addToast]);

  const changeMidGameCategory = useCallback((newCategory) => {
    const safeCategory = typeof newCategory === "string" ? newCategory : "mixed";
    const fullPool = (safeCategory === "mixed") ? TRIVIA_QUESTIONS : getQuestionsByCategory(safeCategory);
    let filteredPool = fullPool.filter(qItem => !usedQuestionIds.includes(qItem.id || qItem.q));

    if (filteredPool.length < 15) {
      setUsedQuestionIds([]);
      filteredPool = [...fullPool];
    }

    const pools = {
      easy: shuffleArray(filteredPool.filter(q => q.difficulty === "easy")),
      medium: shuffleArray(filteredPool.filter(q => q.difficulty === "medium")),
      hard: shuffleArray(filteredPool.filter(q => q.difficulty === "hard")),
      crazy: shuffleArray(filteredPool.filter(q => q.difficulty === "crazy")),
    };

    let nextList = null;
    setQuestionList((prevList) => {
      const updatedList = [...prevList];

      for (let i = qIdx + 1; i < ROUND_DIFFICULTY_STEPS.length; i++) {
        const stepReq = ROUND_DIFFICULTY_STEPS[i];
        const qToAdd = pickForDifficulty(pools, stepReq.difficulty, fullPool);
        if (qToAdd) {
          updatedList[i] = withRoundScoring(qToAdd, stepReq.step);
        }
      }
      nextList = updatedList;
      return updatedList;
    });

    setSelectedCategory(safeCategory);
    setCurrentSpinCategory(safeCategory);
    return nextList;
  }, [qIdx, usedQuestionIds]);

  return {
    q, qIdx, setQIdx, isCrazy, questionList, setQuestionList,
    usedQuestionIds, setUsedQuestionIds, 
    currentSpinCategory, setCurrentSpinCategory,
    selectedCategory, setSelectedCategory,
    advanceToNextQuestion, loadAndFilterQuestions,
    changeMidGameCategory
  };
}
