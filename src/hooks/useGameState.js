// src/hooks/useGameState.js
import { useCallback, useEffect, useRef, useState } from "react";
import { SOUNDS, playSound, playQuestionMusic, stopAllAudio } from "../utils/Sounds"; 
import { normalizeArabic, toWesternDigits, resolveAnswerIndex } from "../utils/ArabicUtils"; 
import { getAllCategories } from "../utils/QuestionManager"; 
import { findGiftDef, migrateRuleGiftId } from "../utils/giftsConfig";
import { isTrustModeEnabled } from "../utils/hostTrust";
import {
  saveLiveSession,
  loadLiveSession,
  clearLiveSession,
  playersForCheckpoint,
  prunePlayers,
} from "../utils/gamePersistence";
import { useTikTokSockets } from "./useTikTokSockets";
import { speakQuestion, stopSpeaking } from "../utils/TextToSpeech"; 

// Import Modular Hooks
import { useDonators } from "./useDonators"; 
import { useLikes } from "./useLikes"; 
import { useQuestionBank } from "./useQuestionBank";
import { useGameTimers } from "./useGameTimers";
import { usePlayers } from "./usePlayers";
import { useVotingSystem } from "./useVotingSystem";
import { useTikTokGifts } from "./useTikTokGifts";

export function useGameState() {
  // 1. Core Visual / Meta States
  const [phase, setPhase] = useState("idle"); 
  const [showAnswer, setShowAnswer] = useState(false); 
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [toasts, setToasts] = useState([]);
  
  // Restored FX / gameplay states (were referenced but missing after refactor)
  const [isQuaking, setIsQuaking] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [vipSponsor, setVipSponsor] = useState(null);
  const [feverMode, setFeverMode] = useState(false);
  const [dragonActive, setDragonActive] = useState(false);
  const [winGoal, setWinGoal] = useState(() => Number(localStorage.getItem("trivia_win_goal")) || 2000);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("");
  const [donorPicker, setDonorPicker] = useState(null);
  const [shuffleAnswers, setShuffleAnswers] = useState(() => localStorage.getItem("trivia_shuffle_answers") === "true");
  const [shuffleMap, setShuffleMap] = useState(null);

  const [isLiveState, setIsLiveState] = useState(() => localStorage.getItem("trivia_is_live") !== "false"); 
  const [ttsSpeed, setTtsSpeed] = useState(() => Number(localStorage.getItem("trivia_tts_speed")) || 1.0); 
  const [isTTSMuted, setIsTTSMuted] = useState(() => localStorage.getItem("trivia_tts_muted") === "true");
  const [ttsPersona, setTtsPersona] = useState(() => localStorage.getItem("trivia_tts_persona") || "default");

  // Local Storage Syncs
  useEffect(() => { localStorage.setItem("trivia_is_live", isLiveState); }, [isLiveState]);
  useEffect(() => { localStorage.setItem("trivia_tts_speed", ttsSpeed); }, [ttsSpeed]);
  useEffect(() => { localStorage.setItem("trivia_tts_muted", isTTSMuted); }, [isTTSMuted]);
  useEffect(() => { localStorage.setItem("trivia_tts_persona", ttsPersona); }, [ttsPersona]);
  useEffect(() => { localStorage.setItem("trivia_win_goal", winGoal); }, [winGoal]);
  useEffect(() => { localStorage.setItem("trivia_shuffle_answers", shuffleAnswers); }, [shuffleAnswers]);

  // Timers & Refs
  const blurTimer = useRef(null);
  const vipTimer = useRef(null);
  const isGameOverRef = useRef(false);
  const isEvaluatingRef = useRef(false); 
  const donorPickerRef = useRef(null); 
  const toastId = useRef(0);
  const wheelTimerRef = useRef(null);
  // Read inside chat handlers without re-registering them every second
  const timeLeftRef = useRef(0);

  const addToast = useCallback((msg, type="info") => {
    const id = ++toastId.current;
    setToasts(p => [...p.slice(-4), {id, msg, type}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  // 2. Initialize Modular Hooks
  const donatorsHook = useDonators();
  const engineRef = useRef({});
  
  const questionBank = useQuestionBank(addToast);
  // Pass React `phase` so timers don't depend on a stale engineRef snapshot
  const timersHook = useGameTimers(engineRef, addToast, phase, questionBank.isCrazy);
  const playersHook = usePlayers(engineRef, addToast);
  const votingHook = useVotingSystem(engineRef, addToast);
  const giftsHook = useTikTokGifts(engineRef, donatorsHook, addToast);

  const [gateWinner, setGateWinner] = useState(null);

  const handleLikesGateComplete = useCallback(({ kind } = {}) => {
    const live = engineRef.current;
    setGateWinner(null);
    if (kind === "voting") {
      if (live.beginVoting) live.beginVoting();
      return;
    }
    if (live.nextQuestion) live.nextQuestion();
  }, []);

  const likesHook = useLikes({
    addToast,
    onGateComplete: handleLikesGateComplete,
  });

  const getLikesSnapshot = useCallback(
    () => ({
      sessionLikes: likesHook.sessionLikes,
      sessionGifts: likesHook.sessionGifts,
      gateBaseline: likesHook.gateBaseline,
      gateGiftBaseline: likesHook.gateGiftBaseline,
      gateActive: likesHook.gateActive,
      gateStep: likesHook.gateStep,
      gateKind: likesHook.gateKind,
    }),
    [
      likesHook.sessionLikes,
      likesHook.sessionGifts,
      likesHook.gateBaseline,
      likesHook.gateGiftBaseline,
      likesHook.gateActive,
      likesHook.gateStep,
      likesHook.gateKind,
    ]
  );

  const startLikesGate = useCallback(
    (step) => {
      timersHook.clearAllTimers();
      stopSpeaking();
      playSound(SOUNDS.gong);
      setGateWinner(null);
      likesHook.startLikesGate({ step, kind: "checkpoint" });
      setPhase("likes_gate");

      const list = questionBank.questionList;
      if (list?.length) {
        saveLiveSession({
          qIdx: questionBank.qIdx,
          category: currentCategory || questionBank.selectedCategory || "mixed",
          players: playersHook.players,
          questionList: list,
          winGoal,
          sessionLikes: likesHook.sessionLikes,
          sessionGifts: likesHook.sessionGifts,
          gateBaseline: likesHook.sessionLikes,
          gateGiftBaseline: likesHook.gateGiftBaseline,
          gateActive: true,
          gateStep: step === 5 || step === 10 ? step : null,
          gateKind: "checkpoint",
        });
      }
    },
    [
      timersHook,
      likesHook,
      questionBank.questionList,
      questionBank.qIdx,
      questionBank.selectedCategory,
      currentCategory,
      playersHook.players,
      winGoal,
    ]
  );

  /** Post-round gate: celebrate winner, then unlock category voting. */
  const startVotingLikesGate = useCallback(() => {
    const ranked = Object.values(playersHook.players || {}).sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );
    const champ =
      playersHook.roundWinner ||
      ranked.find((p) => (p.score || 0) > 0) ||
      null;

    timersHook.clearAllTimers();
    stopSpeaking();
    playSound(SOUNDS.gong);
    setGateWinner(
      champ
        ? {
            id: champ.id,
            name: champ.name || "لاعب",
            avatar: champ.avatar || "",
            score: champ.score || 0,
          }
        : null
    );
    likesHook.startLikesGate({ kind: "voting" });
    setPhase("likes_gate");
  }, [timersHook, likesHook, playersHook.players, playersHook.roundWinner]);

  // Keep currentCategory in sync with question bank selection
  useEffect(() => {
    if (questionBank.selectedCategory) {
      setCurrentCategory(questionBank.selectedCategory);
    }
  }, [questionBank.selectedCategory]);

  // 4. Game Control Functions (declared before engine bridge so they can be referenced)
  const emergencyClear = () => {
    setIsQuaking(false); setVipSponsor(null); setIsBlurred(false); setToasts([]);
    setFeverMode(false); setDragonActive(false); setWheelSpinning(false);
    setDonorPicker(null);
    donorPickerRef.current = null; giftsHook.processedMsgIds?.current?.clear();
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    stopSpeaking(); 
    timersHook.clearAllTimers();
  };

  // Keep ref in sync for gift/voting code that still reads donorPickerRef
  useEffect(() => {
    donorPickerRef.current = donorPicker;
  }, [donorPicker]);

  // Shuffle answer choices when enabled
  useEffect(() => {
    if (shuffleAnswers && questionBank.q?.choices?.length > 1) {
      const n = questionBank.q.choices.length;
      const map = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [map[i], map[j]] = [map[j], map[i]];
      }
      setShuffleMap(map);
    } else {
      setShuffleMap(null);
    }
  }, [shuffleAnswers, questionBank.q]);

  const addTime = useCallback((seconds = 5) => {
    timersHook.setTimeLeft(prev => prev + seconds);
  }, [timersHook]);

  const nextQuestion = useCallback(() => {
    isEvaluatingRef.current = false; setShowAnswer(false); 
    setFeverMode(false);
    const finishedIdx = questionBank.qIdx;
    const nextIdx =
      finishedIdx < (questionBank.questionList?.length || 0) - 1
        ? finishedIdx + 1
        : finishedIdx;
    questionBank.advanceToNextQuestion();
    setHiddenOptions([]);
    
    playersHook.setPlayers(prev => { 
        const reset = {}; 
        Object.keys(prev).forEach(k => { 
            reset[k] = { ...prev[k], currentAnswer: null, status: "idle", speedBonus: 1 }; 
        });
        // Drop 0-score spectators so the player map stays bounded on long streams
        const trimmed = prunePlayers(reset);
        // Refresh checkpoint at the start of the next question (same scores)
        if (questionBank.questionList?.length) {
          saveLiveSession({
            qIdx: nextIdx,
            category: currentCategory || questionBank.selectedCategory || "mixed",
            players: trimmed,
            questionList: questionBank.questionList,
            winGoal,
            sessionLikes: likesHook.sessionLikes,
            sessionGifts: likesHook.sessionGifts,
            gateBaseline: likesHook.gateBaseline,
            gateGiftBaseline: likesHook.gateGiftBaseline,
            gateActive: false,
            gateStep: null,
          });
        }
        return trimmed; 
    });
    setPhase("question"); playQuestionMusic();
  }, [questionBank, playersHook, likesHook, currentCategory, winGoal]);

  const startGame = useCallback((chosenCategory = "mixed") => {
    timersHook.clearAllTimers(); 
    isGameOverRef.current = false; isEvaluatingRef.current = false; setShowAnswer(false); 
    setFeverMode(false); setDragonActive(false); setWheelSpinning(false);
    questionBank.setQIdx(0); playersHook.setPlayers({}); setHiddenOptions([]); 
    playersHook.setRoundWinner(null);
    playersHook.resetMilestones?.(); 
    likesHook.resetSessionLikes();
    setGateWinner(null);
    
    const safeCategory = typeof chosenCategory === "string" ? chosenCategory : "mixed";
    setCurrentCategory(safeCategory);
    questionBank.setSelectedCategory(safeCategory);
    questionBank.setCurrentSpinCategory(safeCategory);

    const newLadder = questionBank.loadAndFilterQuestions(safeCategory);
    questionBank.setQuestionList(newLadder);
    saveLiveSession({
      qIdx: 0,
      category: safeCategory,
      players: {},
      questionList: newLadder,
      winGoal,
      sessionLikes: 0,
      gateBaseline: 0,
      gateActive: false,
      gateStep: null,
    });
    setPhase("question"); 
    // Only start question bed after a real game start (gated by unlockAudio)
    playQuestionMusic(); 
  }, [timersHook, questionBank, playersHook, likesHook, winGoal]);

  // Persist likes progress while the checkpoint gate is open.
  // Debounced: player/like churn can fire this many times a second.
  useEffect(() => {
    if (phase !== "likes_gate") return;
    const list = questionBank.questionList;
    if (!list?.length) return;
    const t = setTimeout(() => {
      saveLiveSession({
        qIdx: questionBank.qIdx,
        category: currentCategory || questionBank.selectedCategory || "mixed",
        players: playersHook.players,
        questionList: list,
        winGoal,
        ...getLikesSnapshot(),
      });
    }, 300);
    return () => clearTimeout(t);
  }, [
    phase,
    likesHook.sessionLikes,
    likesHook.gateBaseline,
    likesHook.gateActive,
    likesHook.gateStep,
    questionBank.questionList,
    questionBank.qIdx,
    questionBank.selectedCategory,
    currentCategory,
    playersHook.players,
    winGoal,
    getLikesSnapshot,
  ]);

  // Idle / game-over should never keep question or voting beds looping
  useEffect(() => {
    if (phase === "idle" || phase === "gameover") {
      stopAllAudio();
    }
    if (phase === "gameover") clearLiveSession();
  }, [phase]);

  // Restore mid-round session after refresh/crash (checkpoint = end of last finished question)
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    const session = loadLiveSession();
    if (!session) return;

    questionBank.setQuestionList(session.questionList);
    questionBank.setQIdx(session.qIdx);
    questionBank.setSelectedCategory(session.category);
    questionBank.setCurrentSpinCategory(session.category);
    setCurrentCategory(session.category);
    playersHook.setPlayers(playersForCheckpoint(session.players));
    playersHook.setRoundWinner(null);
    playersHook.resetMilestones?.();
    likesHook.restoreLikesState({
      sessionLikes: session.sessionLikes,
      sessionGifts: session.sessionGifts,
      gateBaseline: session.gateBaseline,
      gateGiftBaseline: session.gateGiftBaseline,
      gateActive: session.gateActive,
      gateStep: session.gateStep,
    });
    setHiddenOptions([]);
    setFeverMode(false);
    setDragonActive(false);
    setShowAnswer(false);
    setWheelSpinning(false);
    isGameOverRef.current = false;
    isEvaluatingRef.current = false;
    if (session.winGoal) setWinGoal(session.winGoal);
    timersHook.setTimeLeft?.(timersHook.questionDuration);
    timersHook.setIsPaused?.(false);
    if (session.gateActive) {
      setPhase("likes_gate");
      addToast(`♻️ استعادة محطة الإعجابات — بعد السؤال ${session.gateStep || session.qIdx + 1}`, "success");
    } else {
      setPhase("question");
      addToast(`♻️ استعادة الجولة — السؤال ${session.qIdx + 1}`, "success");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot restore once
  }, []);

  const spinWheel = useCallback(() => {
    const cats = getAllCategories();
    if (!cats.length) {
      startGame("mixed");
      return;
    }
    setWheelSpinning(true);
    setPhase("wheel");
    playSound(SOUNDS.spin);

    const picked = cats[Math.floor(Math.random() * cats.length)];
    questionBank.setSelectedCategory(picked);
    questionBank.setCurrentSpinCategory(picked);
    setCurrentCategory(picked);

    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    const resultDelay = timersHook.wheelResultDelay || 1500;
    wheelTimerRef.current = setTimeout(() => {
      setWheelSpinning(false);
      // Let the wheel land, then start the game
      wheelTimerRef.current = setTimeout(() => {
        startGame(picked);
      }, resultDelay);
    }, 2500);
  }, [questionBank, timersHook.wheelResultDelay, startGame]);

  // Skip only advances the current phase's timer — never jumps voting → evaluateRound
  const skipTurn = useCallback(() => {
    const currentPhase = phase;

    if (currentPhase === "likes_gate") {
      likesHook.forceCompleteLikesGate();
      return;
    }

    // Voting OR result banner: ONE path — finish vote / start voted category.
    // Never call evaluateRound/nextQuestion from here (that was the category bug).
    if (currentPhase === "voting" || currentPhase === "voting_result") {
      timersHook.setVotingTimeLeft?.(0);
      if (votingHook.skipVotingTimer) {
        votingHook.skipVotingTimer();
      } else {
        votingHook.endVoting?.(null, { hostSkip: true, immediate: true });
      }
      return;
    }

    if (currentPhase === "question" || currentPhase === "reveal") {
      timersHook.clearAllTimers();
      playersHook.evaluateRound();
      return;
    }

    if (currentPhase === "result") {
      timersHook.clearAllTimers();
      const list = questionBank.questionList;
      const isFinal =
        list && list.length > 0 && questionBank.qIdx >= list.length - 1;

      const gateEvery = Math.max(1, Number(likesHook.gateEvery) || 3);
      const step = questionBank.q?.ladderStep || (questionBank.qIdx + 1);
      const isCadenceHit = !isFinal && gateEvery > 0 && (questionBank.qIdx + 1) % gateEvery === 0;
      const isLegacyStepHit = step === 5 || step === 10;

      if (!isFinal && (isCadenceHit || isLegacyStepHit)) {
        startLikesGate(step);
      } else {
        nextQuestion();
      }
      return;
    }

    if (currentPhase === "wheel") {
      timersHook.clearAllTimers();
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      setWheelSpinning(false);
      const cat =
        questionBank.selectedCategory ||
        questionBank.currentSpinCategory ||
        currentCategory ||
        "mixed";
      startGame(cat);
    }
  }, [phase, votingHook, playersHook, timersHook, questionBank, currentCategory, startGame, likesHook, startLikesGate, nextQuestion]);

  // 3. Engine Bridge Sync
  engineRef.current = { 
      phase, setPhase, q: questionBank.q, hiddenOptions, setHiddenOptions, 
      players: playersHook.players, setPlayers: playersHook.setPlayers, 
      triggerWin: playersHook.triggerWin, votes: votingHook.votes, 
      endVoting: votingHook.endVoting, setTimeLeft: timersHook.setTimeLeft, 
      setIsQuaking, setQIdx: questionBank.setQIdx, 
      qIdx: questionBank.qIdx, questionList: questionBank.questionList, 
      questionDuration: timersHook.questionDuration, 
      resultDuration: timersHook.resultDuration, startVoting: votingHook.startVoting, 
      setIsBlurred, blurTimer, setVipSponsor, vipTimer, 
      donorPickerRef, donorPicker, setDonorPicker, stopSpeaking, isGameOverRef, isEvaluatingRef, 
      resetGameGuards: () => { isGameOverRef.current = false; isEvaluatingRef.current = false; },
      isCrazy: questionBank.isCrazy, 
      nextQuestion, donatorsHook, startGame, changeMidGameCategory: questionBank.changeMidGameCategory,
      clearAllTimers: timersHook.clearAllTimers,
      trackTimeout: timersHook.trackTimeout,
      votingDuration: timersHook.votingDuration, 
      voteDuration: timersHook.votingDuration, 
      setVotingTimeLeft: timersHook.setVotingTimeLeft, votingTimeLeft: timersHook.votingTimeLeft, 
      votingResultDelay: timersHook.votingResultDelay, setShowAnswer, 
      evaluateRound: playersHook.evaluateRound,
      feverMode, setFeverMode, dragonActive, setDragonActive,
      winGoal, setWinGoal,
      celebrateScoreMilestone: playersHook.celebrateScoreMilestone,
      setRoundWinner: playersHook.setRoundWinner,
      setSelectedCategory: questionBank.setSelectedCategory,
      setCurrentSpinCategory: questionBank.setCurrentSpinCategory,
      category: currentCategory || questionBank.selectedCategory,
      selectedCategory: questionBank.selectedCategory,
      spinWheel,
      startLikesGate,
      startVotingLikesGate,
      beginVoting: votingHook.startVoting,
      getLikesSnapshot,
      shuffleMap: shuffleMap,
      shuffleAnswers, setShuffleAnswers,
      addTime,
  };

  const triggerGiftLogicOverride = useCallback((ruleId, user, coins = 0) => {
    const rule = giftsHook.triggerRules?.find(r => r.id === ruleId);
    if (rule && rule.action?.startsWith("cat_")) {
        const cat = rule.action.replace("cat_", "");
        if (donatorsHook.trackDonation) donatorsHook.trackDonation(user, coins || rule.value || 0);
        
        if (phase === "question" || phase === "reveal" || phase === "result") {
            setPhase("question"); 
            addToast(`🚨 عاجل: ${user.name || "مشاهد"} حسم الفئة وغيّر الأسئلة القادمة إلى [ ${cat} ] ! 🔥`, "success");
            const updatedList = questionBank.changeMidGameCategory(cat);
            setCurrentCategory(cat);
            if (updatedList?.length) {
              saveLiveSession({
                qIdx: questionBank.qIdx,
                category: cat,
                players: playersHook.players,
                questionList: updatedList,
                winGoal,
                ...getLikesSnapshot(),
              });
            }
        } else {
            addToast(`📁 ${user.name || "مشاهد"} اختار الفئة القادمة: ${cat}!`, "success");
            startGame(cat);
        }
        return;
    }

    if (giftsHook.triggerGiftLogic) giftsHook.triggerGiftLogic(ruleId, user, coins);
  }, [giftsHook, donatorsHook, addToast, phase, questionBank, playersHook.players, getLikesSnapshot, startGame, winGoal]);

  // 5. Socket Handlers
  const handleChatBatch = useCallback((chatBatch) => {
    const batch = Array.isArray(chatBatch) ? chatBatch : [chatBatch];
    batch.forEach(chat => { if (window.handleGlobalChat) window.handleGlobalChat(chat.userId || chat.username, chat.name || chat.username, chat.avatar, chat.message); });
  }, []);

  const handleGiftBatch = useCallback((giftBatch) => {
    const batch = Array.isArray(giftBatch) ? giftBatch : [giftBatch];
    batch.forEach(gift => {
      const gId = gift.msgId || gift.msg_id || `${gift.userId}_${gift.giftId}_${gift.timestamp}`;
      if (giftsHook.processedMsgIds.current.has(gId)) return; 
      giftsHook.processedMsgIds.current.add(gId);
      setTimeout(() => giftsHook.processedMsgIds.current.delete(gId), 8000); 

      const incomingGiftName = gift.giftName || gift.name || ""; 
      let trueCoinValue = 0;
      if (gift.diamondCount) trueCoinValue = Number(gift.diamondCount);
      else if (gift.coins) trueCoinValue = Number(gift.coins);
      else if (gift.baseCost) trueCoinValue = Number(gift.baseCost);
      else if (gift.gift && gift.gift.diamondCount) trueCoinValue = Number(gift.gift.diamondCount);
      if (isNaN(trueCoinValue)) trueCoinValue = 0;

      // Alias-aware match: crown→little_crown, universe→tiktok_universe, etc.
      const matchedGiftDef =
        findGiftDef(gift.giftId) ||
        findGiftDef(incomingGiftName) ||
        findGiftDef(gift.gift?.giftId) ||
        findGiftDef(gift.gift?.name);

      if (matchedGiftDef) {
        const catalogId = matchedGiftDef.id;
        const matchedRule = giftsHook.triggerRules.find(
          (r) => migrateRuleGiftId(r.giftId) === catalogId
        );
        if (matchedRule) {
          triggerGiftLogicOverride(
            matchedRule.id,
            {
              id: gift.userId || gift.username,
              name: gift.name || gift.username,
              avatar: gift.avatar,
              msgId: gId,
            },
            trueCoinValue
          );
        } else if (trueCoinValue > 0 && donatorsHook.trackDonation) {
          // Still track diamonds even when gift has no power-up rule
          donatorsHook.trackDonation(
            { id: gift.userId || gift.username, name: gift.name || gift.username, avatar: gift.avatar },
            trueCoinValue
          );
        }
      }
    });
  }, [giftsHook, triggerGiftLogicOverride, donatorsHook]);

  const handleLikeBatch = useCallback((likesBatch) => {
    const batch = Array.isArray(likesBatch) ? likesBatch : [likesBatch];
    // Bridge emits `count` / `likeCount` (already room-total deltas when available)
    const newLikesCount = batch.reduce((sum, evt) => {
      const n = Number(evt?.likeCount ?? evt?.count);
      return sum + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
    if (newLikesCount > 0) likesHook.addManualLikes(newLikesCount);
  }, [likesHook]);

  const handleConnect = useCallback(() => { addToast("🟢 تم الاتصال بجسر التيك توك!", "success"); }, [addToast]);

  const {
    connectionStatus,
    socketConnected,
    connectTikTok,
    disconnectTikTok,
    requestStatus,
  } = useTikTokSockets({
    onChatBatch: handleChatBatch,
    onGiftBatch: handleGiftBatch,
    onLikeBatch: handleLikeBatch,
    onConnect: handleConnect,
  });

  // Auto-pause when the TikTok bridge drops mid-game
  const wasSocketConnected = useRef(false);
  useEffect(() => {
    if (socketConnected) {
      if (!wasSocketConnected.current && timersHook.isPaused && phase !== "idle") {
        // Optional: do not auto-resume — host must unpause after reconnect
      }
      wasSocketConnected.current = true;
      return;
    }
    if (wasSocketConnected.current && phase !== "idle" && !timersHook.isPaused) {
      timersHook.setIsPaused(true);
      addToast("🔴 انقطع الجسر — تم إيقاف اللعبة مؤقتاً", "error");
    }
    wasSocketConnected.current = false;
  }, [socketConnected, phase, timersHook, addToast]);

  // 6. Global Listeners
  useEffect(() => {
    timeLeftRef.current = timersHook.timeLeft;
  }, [timersHook.timeLeft]);

  useEffect(() => {
    if (!isLiveState) { 
      delete window.handleGlobalChat; delete window.submitViewerGift; return; 
    }

    window.handleGlobalChat = (userId, userName, avatar, text) => {
      // Accept during the reveal grace window too — the answer only stops counting
      // once evaluateRound flips the phase to "result".
      if (phase === "question" || phase === "reveal") {
        playersHook.setPlayers(prev => {
          const existing = prev[userId] || { id: userId, name: userName, avatar, score: 0, streak: 0, status: "idle", speedBonus: 1, lastEarned: 0 };
          
          if (existing.currentAnswer) return prev; 
          
          const choices = questionBank.q?.choices || [];
          const resolvedIndex = resolveAnswerIndex(text, choices, engineRef.current?.shuffleMap);
          if (resolvedIndex == null) return prev;

          const cleanText = normalizeArabic(text || "");
          
          return { ...prev, [userId]: { ...existing, currentAnswer: cleanText, status: "answered", answeredAtTime: timeLeftRef.current } };
        });
      } else if (phase === "voting") {
        const western = toWesternDigits(normalizeArabic(text || "").trim());
        const choice = parseInt(western, 10) - 1; 
        if (Number.isNaN(choice) || choice < 0 || choice >= votingHook.votingOptions.length) return;

        // Exclusive dictator mode: only the donor can pick
        if (donorPicker) {
          if (donorPicker.id !== userId) return;
          votingHook.setVotes({ [userId]: { name: userName, avatar, choice } });
          setDonorPicker(null);
          donorPickerRef.current = null;
          addToast(`👑 ${userName} اختار الفئة وحده!`, "success");
          votingHook.endVoting(choice);
          return;
        }

        votingHook.setVotes(prev => ({ ...prev, [userId]: { name: userName, avatar, choice } }));
      }
    };

    // Trust mode: block console spoof of gifts. Host Debug uses triggerGiftLogic directly.
    window.submitViewerGift = (userId, userName, avatar, ruleId, coins = 0) => {
      if (isTrustModeEnabled()) {
        console.warn("[trust] submitViewerGift disabled in trust mode — use Debug host triggers");
        return;
      }
      triggerGiftLogicOverride(ruleId, { id: userId, name: userName, avatar }, coins);
    };

    return () => { delete window.handleGlobalChat; delete window.submitViewerGift; };
  }, [phase, questionBank.q, votingHook.votingOptions, isLiveState, playersHook, votingHook, giftsHook, addToast, triggerGiftLogicOverride, donorPicker]);

  // Voice TTS 
  useEffect(() => {
    if (phase === "question" && questionBank.q?.q && !isTTSMuted) {
      const voiceTimeout = setTimeout(() => { speakQuestion(questionBank.q.q, questionBank.q.persona || ttsPersona, ttsSpeed); }, 500);
      return () => clearTimeout(voiceTimeout);
    } else { stopSpeaking(); }
  }, [phase, questionBank.q, isTTSMuted, ttsPersona, ttsSpeed]);

  useEffect(() => {
    return () => {
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, []);

  // Dev/test probe for automated voting skip checks (browser console / CDP)
  // Disabled in trust/prize mode to reduce spoof surface.
  if (typeof window !== "undefined") {
    if (isTrustModeEnabled()) {
      delete window.__gameProbe;
    } else {
      window.__gameProbe = {
        getPhase: () => phase,
        getCategory: () => currentCategory || questionBank.selectedCategory || "",
        getQCategory: () => questionBank.q?.category || "",
        getVotingOptions: () => votingHook.votingOptions,
        getVotes: () => votingHook.votes,
        startVoting: () => votingHook.startVoting(),
        skipTurn,
        castVote: (userId, choice) => {
          votingHook.setVotes((prev) => ({
            ...prev,
            [userId]: { name: userId, avatar: "", choice },
          }));
        },
        runSkipTest: () => {
          const opts = votingHook.votingOptions;
          if (phase !== "voting" || !opts?.length) {
            votingHook.startVoting();
          }
          return new Promise((resolve) => {
            setTimeout(() => {
              const options = window.__gameProbe.getVotingOptions();
              const targetIdx = 2;
              const expected = options[targetIdx];
              window.__gameProbe.castVote("auto1", targetIdx);
              window.__gameProbe.castVote("auto2", targetIdx);
              window.__gameProbe.castVote("auto3", 0);
              window.__gameProbe.skipTurn();
              setTimeout(() => {
                resolve({
                  expected,
                  phase: window.__gameProbe.getPhase(),
                  category: window.__gameProbe.getCategory(),
                  qCategory: window.__gameProbe.getQCategory(),
                  pass:
                    window.__gameProbe.getPhase() === "question" &&
                    (window.__gameProbe.getCategory() === expected ||
                      window.__gameProbe.getQCategory() === expected),
                });
              }, 100);
            }, 50);
          });
        },
      };
    }
  }

  return {
    phase, showAnswer, toasts, isQuaking, isLiveState, setIsLiveState,
    ttsSpeed, setTtsSpeed, isTTSMuted, setIsTTSMuted, ttsPersona, setTtsPersona,
    isBlurred, vipSponsor, emergencyClear, startGame, skipTurn, spinWheel,
    feverMode, setFeverMode, dragonActive, setDragonActive,
    winGoal, setWinGoal, wheelSpinning, currentCategory,
    donorPicker, setDonorPicker,
    connectionStatus, socketConnected, connectTikTok, disconnectTikTok, requestStatus,
    ...donatorsHook, ...questionBank, ...playersHook, ...votingHook, ...giftsHook,
    hiddenOptions, setHiddenOptions,
    triggerGiftLogic: triggerGiftLogicOverride,
    startLikesGate,
    startVotingLikesGate,
    gateWinner,
    shuffleAnswers, setShuffleAnswers, shuffleMap, addTime,
    ...likesHook, ...timersHook,
  };
}
