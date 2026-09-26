// src/hooks/useVotingSystem.js
import { useState, useEffect, useRef, useCallback } from "react";
import { SOUNDS, playSound, playVotingMusic, stopMusic } from "../utils/Sounds";
import { getAllCategories } from "../utils/QuestionManager";

export function shuffleArray(array) {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function tallyWinningIndex(votes, optionCount) {
  const n = Math.max(optionCount, 1);
  const counts = Array(n).fill(0);
  Object.values(votes).forEach((v) => {
    if (v.choice >= 0 && v.choice < n) counts[v.choice]++;
  });
  let winningIdx = 0;
  let maxVotes = -1;
  counts.forEach((c, i) => {
    if (c > maxVotes) {
      maxVotes = c;
      winningIdx = i;
    }
  });
  return { winningIdx, maxVotes };
}

export function useVotingSystem(engineRef, addToast) {
  const [votingOptions, setVotingOptions] = useState([]);
  const [votes, setVotes] = useState({});
  const [votingResult, setVotingResult] = useState(null);

  const latestVotes = useRef({});
  const latestVotingOptions = useRef([]);
  const endingLockRef = useRef(false);
  const pendingCategoryRef = useRef(null);
  const startTimerRef = useRef(null);

  useEffect(() => { latestVotes.current = votes; }, [votes]);
  useEffect(() => { latestVotingOptions.current = votingOptions; }, [votingOptions]);

  // Update refs SYNCHRONOUSLY before setState — React may delay the updater,
  // and host-skip in the same tick must still see the latest votes.
  const setVotesSync = useCallback((updater) => {
    const prev = latestVotes.current || {};
    const next = typeof updater === "function" ? updater(prev) : updater;
    latestVotes.current = next || {};
    setVotes(next || {});
  }, []);

  const setVotingOptionsSync = useCallback((updater) => {
    const prev = latestVotingOptions.current || [];
    const next = typeof updater === "function" ? updater(prev) : updater;
    latestVotingOptions.current = next || [];
    setVotingOptions(next || []);
  }, []);

  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  }, []);

  const flushStartGame = useCallback(() => {
    const engine = engineRef.current || {};
    const winningCategory = pendingCategoryRef.current;
    clearStartTimer();

    if (!winningCategory) {
      endingLockRef.current = false;
      return;
    }

    pendingCategoryRef.current = null;
    endingLockRef.current = false;
    setVotingResult(null);

    if (engine.setSelectedCategory) engine.setSelectedCategory(winningCategory);
    if (engine.setCurrentSpinCategory) engine.setCurrentSpinCategory(winningCategory);

    if (typeof engine.startGame === "function") {
      engine.startGame(winningCategory);
    } else if (addToast) {
      addToast("⚠️ فشل بدء اللعبة بعد التصويت", "error");
    }
  }, [engineRef, addToast, clearStartTimer]);

  const startVoting = useCallback(() => {
    const engine = engineRef.current || {};

    // Kill leftover question/result/vote-start timers so they can't steal the phase
    clearStartTimer();
    if (engine.clearAllTimers) engine.clearAllTimers();
    endingLockRef.current = false;
    pendingCategoryRef.current = null;

    if (engine.resetGameGuards) engine.resetGameGuards();

    if (engine.setQIdx) engine.setQIdx(0);
    if (engine.setPlayers) engine.setPlayers({});
    if (engine.setHiddenOptions) engine.setHiddenOptions([]);
    if (engine.setFeverMode) engine.setFeverMode(false);
    if (engine.setRoundWinner) engine.setRoundWinner(null);
    if (engine.setShowAnswer) engine.setShowAnswer(false);

    const allCats = getAllCategories();
    const options = shuffleArray([...allCats]).slice(0, 5);

    latestVotingOptions.current = options;
    latestVotes.current = {};
    setVotingOptionsSync(options);
    setVotesSync({});
    setVotingResult(null);

    if (engine.setVotingTimeLeft) engine.setVotingTimeLeft(engine.votingDuration || 30);
    if (engine.setPhase) engine.setPhase("voting");
    playVotingMusic();
  }, [engineRef, clearStartTimer, setVotingOptionsSync, setVotesSync]);

  /**
   * End voting and schedule (or immediately start) the winning category.
   * `hostSkip` bypasses stale engine.phase checks — host button is always trusted.
   */
  const endVoting = useCallback((forcedChoiceIdx = null, { hostSkip = false, immediate = false } = {}) => {
    const engine = engineRef.current || {};

    // Already finished voting — host skip should just start the pending category now
    if (endingLockRef.current) {
      if (hostSkip || immediate) flushStartGame();
      return;
    }

    // Guard accidental double-fires from the timer, but NEVER block an explicit host skip
    const livePhase = engine.phase;
    if (!hostSkip && livePhase && livePhase !== "voting") {
      return;
    }

    endingLockRef.current = true;
    // Only clear question/vote INTERVALS — do not touch our own start timer yet
    if (engine.clearAllTimers) engine.clearAllTimers();
    clearStartTimer();

    const dictator = engine.donorPickerRef?.current || engine.donorPicker || null;
    const wasDictatorMode = !!dictator;

    if (engine.setDonorPicker) engine.setDonorPicker(null);

    const currentVotes = latestVotes.current;
    const currentOptions = latestVotingOptions.current || [];
    let winningIdx = 0;
    let wasForced = forcedChoiceIdx !== null && forcedChoiceIdx !== undefined;

    if (wasForced && forcedChoiceIdx >= 0 && forcedChoiceIdx < currentOptions.length) {
      winningIdx = forcedChoiceIdx;
    } else if (wasDictatorMode && dictator?.id != null && currentVotes[dictator.id] != null) {
      winningIdx = currentVotes[dictator.id].choice;
      wasForced = true;
    } else if (wasDictatorMode) {
      winningIdx = 0;
      wasForced = true;
      if (addToast) addToast("⏱ انتهى التصويت — اختيار الفئة رقم 1", "warning");
    } else {
      const tallied = tallyWinningIndex(currentVotes, currentOptions.length || 5);
      winningIdx = tallied.winningIdx;
      if (tallied.maxVotes <= 0 && addToast) {
        addToast("⏱ لا أصوات — اختيار الفئة رقم 1", "info");
      }
    }

    const winningCategory = currentOptions[winningIdx] || currentOptions[0] || "mixed";
    const winningVoters = wasDictatorMode && dictator
      ? [{ name: dictator.name, avatar: dictator.avatar, choice: winningIdx }]
      : Object.values(currentVotes).filter((v) => v.choice === winningIdx);

    pendingCategoryRef.current = winningCategory;

    setVotingResult({
      category: winningCategory,
      voters: winningVoters,
      wasForced,
      dictatorName: wasDictatorMode ? dictator?.name : null,
    });
    if (engine.setPhase) engine.setPhase("voting_result");
    stopMusic();
    // Skip path stays quiet — no win fanfare stacked on question music
    if (!hostSkip && !immediate) {
      playSound(SOUNDS.win);
    }

    if (immediate || hostSkip) {
      flushStartGame();
      return;
    }

    const delay = Number(engine.votingResultDelay) || 5000;
    startTimerRef.current = setTimeout(() => {
      startTimerRef.current = null;
      flushStartGame();
    }, delay);
  }, [engineRef, addToast, flushStartGame, clearStartTimer]);

  /** Skip the result banner and start the voted category immediately */
  const skipVotingResult = useCallback(() => {
    flushStartGame();
  }, [flushStartGame]);

  /**
   * Single host entry-point for "تخطي الوقت" during voting OR voting_result.
   * Always ends on the voted/tallied category — never evaluateRound / nextQuestion.
   */
  const skipVotingTimer = useCallback(() => {
    if (endingLockRef.current || pendingCategoryRef.current) {
      flushStartGame();
      return;
    }
    endVoting(null, { hostSkip: true, immediate: true });
  }, [endVoting, flushStartGame]);

  return {
    votingOptions, setVotingOptions: setVotingOptionsSync,
    votes, setVotes: setVotesSync,
    votingResult, setVotingResult,
    startVoting, endVoting, skipVotingResult, skipVotingTimer,
  };
}
