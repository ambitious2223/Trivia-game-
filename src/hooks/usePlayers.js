// src/hooks/usePlayers.js
import { useState, useEffect, useCallback, useRef } from "react";
import { SOUNDS, playSound, stopMusic, playEpicWinSound } from "../utils/Sounds";
import { stopSpeaking } from "../utils/TextToSpeech";
import { isPlayerAnswerCorrect, calculateSpeedBonus } from "../utils/ArabicUtils";
import { getPointsForDifficulty } from "../utils/QuestionManager.js";
import {
  loadAllTimeWinners,
  saveAllTimeWinners,
  clearAllTimeWinners,
  normalizeKingRecord,
  sortByWins,
  saveLiveSession,
  clearLiveSession,
  playersForCheckpoint,
} from "../utils/gamePersistence";

export function formatScoreCompact(score) {
  if (!score || isNaN(score)) return "0";
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(score % 1_000_000 === 0 ? 0 : 1) + "M";
  if (score >= 1_000) return (score / 1_000).toFixed(score % 1_000 === 0 ? 0 : 1) + "K";
  return score.toString();
}

/** Streak multiplier: +10% per correct after 3 in a row, capped at 2x */
export function getStreakMultiplier(streak) {
  if (!streak || streak < 3) return 1;
  return Math.min(2, 1 + 0.1 * (streak - 2));
}

export function usePlayers(engineRef, addToast) {
  const [players, setPlayers] = useState({});
  const [roundWinner, setRoundWinner] = useState(null);
  const [allTimeWinners, setAllTimeWinners] = useState(loadAllTimeWinners);
  const milestoneHitRef = useRef(new Set());

  useEffect(() => {
    saveAllTimeWinners(allTimeWinners);
  }, [allTimeWinners]);

  const resetMilestones = useCallback(() => {
    milestoneHitRef.current = new Set();
  }, []);

  /** Score threshold hype only — never ends the round */
  const celebrateScoreMilestone = useCallback((player, prevScore, newScore) => {
    const engine = engineRef.current;
    const goal = Number(engine.winGoal) || 0;
    if (!goal || !player?.id) return false;
    if (prevScore >= goal || newScore < goal) return false;
    if (milestoneHitRef.current.has(player.id)) return false;
    milestoneHitRef.current.add(player.id);
    playSound(SOUNDS.gong);
    addToast(`🎯 ${player.name} وصل إلى معلم ${formatScoreCompact(goal)} نقطة!`, "success");
    return true;
  }, [engineRef, addToast]);

  const triggerWin = useCallback((winner = null) => {
    const engine = engineRef.current;
    if (engine.isGameOverRef?.current) return;
    if (engine.isGameOverRef) engine.isGameOverRef.current = true;
    stopMusic();
    clearLiveSession();

    playSound(SOUNDS.drumroll);
    setTimeout(() => playEpicWinSound(), 2500);

    if (engine.setPhase) engine.setPhase("gameover");

    // One crown per round: highest score gets +1 win (not point totals)
    setPlayers((currentPlayers) => {
      const ranked = Object.values(currentPlayers || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
      const champ = winner && winner.id
        ? winner
        : ranked.find((p) => (p.score || 0) > 0) || null;

      setRoundWinner(champ);

      if (champ?.id) {
        setAllTimeWinners((prev) => {
          const updated = prev.map(normalizeKingRecord).filter(Boolean);
          const idx = updated.findIndex((w) => w.id === champ.id);
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              name: champ.name || updated[idx].name,
              avatar: champ.avatar || updated[idx].avatar,
              wins: (updated[idx].wins || 0) + 1,
            };
          } else {
            updated.push({
              id: champ.id,
              name: champ.name,
              avatar: champ.avatar,
              wins: 1,
            });
          }
          const sorted = sortByWins(updated);
          saveAllTimeWinners(sorted);
          return sorted;
        });
        if (addToast) addToast(`👑 ${champ.name} فاز بالجولة! (+1 فوز)`, "success");
      }

      return currentPlayers;
    });
  }, [engineRef, addToast]);

  const evaluateRound = useCallback(() => {
    const engine = engineRef.current;
    if (engine.isEvaluatingRef?.current) return;
    if (engine.isEvaluatingRef) engine.isEvaluatingRef.current = true;

    if (engine.setPhase) engine.setPhase("result");
    stopMusic();
    stopSpeaking();

    // Difficulty is the only source of truth (max 200) — ignore stale ladder points
    const currentPrize = getPointsForDifficulty(engine.q?.difficulty);
    const ladderStep = engine.q?.ladderStep || (engine.qIdx + 1);
    let fastestCorrect = null;

    setPlayers((prev) => {
      const nextPlayers = {};
      let correctCount = 0;
      const totalPlayers = Object.keys(prev).length;

      Object.keys(prev).forEach((playerId) => {
        const p = { ...prev[playerId] };
        p.lastScore = p.score;
        const prevScore = p.score;

        if (!p.currentAnswer) {
          p.status = "wrong";
          p.speedBonus = 1;
          p.streak = 0;
          p.lastEarned = 0;
          nextPlayers[playerId] = p;
          return;
        }

        const isCorrect = isPlayerAnswerCorrect(p.currentAnswer, engine.q, engine.shuffleMap);

        if (isCorrect) {
          const totalTime = engine.questionDuration || 15;
          const answeredAt = typeof p.answeredAtTime === "number" ? p.answeredAtTime : 0;
          const speedMul = calculateSpeedBonus(answeredAt, totalTime);
          const feverMul = engine.feverMode ? 2 : 1;
          const nextStreak = (p.streak || 0) + 1;
          const streakMul = getStreakMultiplier(nextStreak);
          const earned = Math.round(currentPrize * speedMul * feverMul * streakMul);
          p.score = p.score + earned;
          p.status = "correct";
          p.speedBonus = speedMul;
          p.streakMul = streakMul;
          p.streak = nextStreak;
          p.lastEarned = earned;
          correctCount++;
          celebrateScoreMilestone(p, prevScore, p.score);

          if (nextStreak === 3 || nextStreak === 5) {
            addToast(`🔥 ${p.name} سلسلة ${nextStreak} إجابات صحيحة!`, "success");
          }

          const answerSpeed = totalTime - answeredAt;
          if (!fastestCorrect || answerSpeed < fastestCorrect.answerSpeed) {
            fastestCorrect = { name: p.name, answerSpeed, speedMul };
          }
        } else {
          p.status = "wrong";
          p.speedBonus = 1;
          p.streakMul = 1;
          p.streak = 0;
          p.lastEarned = 0;
        }

        nextPlayers[playerId] = p;
      });

      if (correctCount > 0) {
        playSound(SOUNDS.correct);
        addToast(`🎉 ${correctCount} لاعبين أجابوا بشكل صحيح!`, "success");
        if (fastestCorrect && fastestCorrect.speedMul >= 1.5) {
          addToast(`⚡ أسرع إجابة: ${fastestCorrect.name}!`, "success");
        }
      } else if (totalPlayers > 0) {
        playSound(SOUNDS.wrong);
        addToast("❌ لم ينجح أحد في هذه الجولة!", "error");
      }

      if (ladderStep === 5) {
        playSound(SOUNDS.gong);
        addToast("🔥 منتصف الطريق! السؤال 5 اكتمل!", "success");
      } else if (ladderStep === 10) {
        playSound(SOUNDS.gong);
        addToast("⚡ باقي 5 أسئلة! السؤال 10 اكتمل!", "success");
      }

      // Checkpoint: scores after this question — restore resumes at next index
      const list = engine.questionList || [];
      const finishedIdx = typeof engine.qIdx === "number" ? engine.qIdx : 0;
      const isFinal = list.length > 0 && finishedIdx >= list.length - 1;
      const likesSnap = engine.getLikesSnapshot?.() || {};
      if (isFinal || list.length === 0) {
        clearLiveSession();
      } else {
        saveLiveSession({
          qIdx: finishedIdx + 1,
          category: engine.category || engine.selectedCategory || "mixed",
          players: playersForCheckpoint(nextPlayers),
          questionList: list,
          winGoal: engine.winGoal,
          ...likesSnap,
        });
      }

      return nextPlayers;
    });

    // Single win rule: only after the final ladder question
    // Must be tracked so startVoting / skip can cancel this (was leaking into voting)
    const continueMs = (engine.resultDuration || 5) * 1000;
    const continueRound = () => {
      const live = engineRef.current;
      if (live.phase === "voting" || live.phase === "voting_result" || live.phase === "wheel") return;
      if (live.phase === "likes_gate") return;
      const list = live.questionList;
      const isFinalQuestion = list && list.length > 0 && live.qIdx >= list.length - 1;
      const step = live.q?.ladderStep || (live.qIdx + 1);
      const isLikesGateStep = step === 5 || step === 10;
      if (isFinalQuestion) {
        triggerWin(null);
      } else if (isLikesGateStep && live.startLikesGate) {
        live.startLikesGate(step);
      } else if (live.nextQuestion) {
        live.nextQuestion();
      }
    };
    if (engine.trackTimeout) {
      engine.trackTimeout(continueRound, continueMs);
    } else {
      setTimeout(continueRound, continueMs);
    }
  }, [engineRef, addToast, triggerWin, celebrateScoreMilestone]);

  const handleAdjustWins = useCallback((playerId, amount) => {
    setAllTimeWinners((prev) => {
      const next = sortByWins(
        prev
          .map((w) =>
            w.id === playerId
              ? {
                  ...normalizeKingRecord(w),
                  wins: Math.max(0, (normalizeKingRecord(w)?.wins || 0) + amount),
                }
              : normalizeKingRecord(w)
          )
          .filter(Boolean)
      );
      saveAllTimeWinners(next);
      return next;
    });
  }, []);

  const handleDeleteWinner = useCallback((id) => {
    setAllTimeWinners((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveAllTimeWinners(next);
      return next;
    });
  }, []);

  const handleRenameWinner = useCallback((id, newName) => {
    setAllTimeWinners((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...normalizeKingRecord(w), name: newName } : w
      );
      saveAllTimeWinners(next);
      return next;
    });
  }, []);

  const handleClearAllTime = useCallback(() => {
    if (window.confirm("🗑 مسح ملوك اللعبة؟")) {
      setAllTimeWinners([]);
      clearAllTimeWinners();
    }
  }, []);

  const handleAddManualWinner = useCallback((name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    setAllTimeWinners((prev) => {
      const next = sortByWins([
        ...prev.map(normalizeKingRecord).filter(Boolean),
        {
          id: `manual_${Date.now()}`,
          name: trimmed,
          avatar: `https://unavatar.io/tiktok/${encodeURIComponent(trimmed)}`,
          wins: 1,
        },
      ]);
      saveAllTimeWinners(next);
      return next;
    });
  }, []);

  const handleRefreshWinnerImages = useCallback(() => {
    setAllTimeWinners((prev) => {
      const next = prev.map((item) => ({
        ...item,
        avatar: `https://unavatar.io/tiktok/${item.id}`,
      }));
      saveAllTimeWinners(next);
      return next;
    });
    if (engineRef.current?.donatorsHook?.handleRefreshDonatorImages) {
      engineRef.current.donatorsHook.handleRefreshDonatorImages();
    }
    addToast("🔄 تم تحديث الصور!", "success");
  }, [engineRef, addToast]);

  return {
    players, setPlayers, roundWinner, setRoundWinner, allTimeWinners, setAllTimeWinners,
    triggerWin, evaluateRound, celebrateScoreMilestone, resetMilestones,
    handleAdjustWins, handleDeleteWinner, handleRenameWinner,
    handleClearAllTime, handleAddManualWinner, handleRefreshWinnerImages,
  };
}
