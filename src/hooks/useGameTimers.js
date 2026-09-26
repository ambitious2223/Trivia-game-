// src/hooks/useGameTimers.js
import { useState, useEffect, useRef, useCallback } from "react";
import { SOUNDS, playSound, stopMusic } from "../utils/Sounds";
import { stopSpeaking } from "../utils/TextToSpeech";

export function useGameTimers(engineRef, addToast, phase = "idle") {
  const [questionDuration, setQuestionDuration] = useState(() => Number(localStorage.getItem("trivia_q_dur")) || 15);
  const [resultDuration, setResultDuration] = useState(() => Number(localStorage.getItem("trivia_res_dur")) || 5);
  const [votingDuration, setVotingDuration] = useState(() => Number(localStorage.getItem("trivia_vote_dur")) || 30);
  const [revealDelay, setRevealDelay] = useState(() => Number(localStorage.getItem("trivia_reveal_delay")) || 2000); 
  const [evalDelay, setEvalDelay] = useState(() => Number(localStorage.getItem("trivia_eval_delay")) || 5500); 
  const [votingResultDelay, setVotingResultDelay] = useState(() => Number(localStorage.getItem("trivia_voting_res_delay")) || 5000); 
  const [wheelResultDelay, setWheelResultDelay] = useState(() => Number(localStorage.getItem("trivia_wheel_res_delay")) || 1500); 

  const [timeLeft, setTimeLeft] = useState(questionDuration);
  const [votingTimeLeft, setVotingTimeLeft] = useState(votingDuration);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef(null);
  const graceTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const votingTimerRef = useRef(null);
  const trackedTimeoutsRef = useRef(new Set());
  const phaseRef = useRef(phase);

  useEffect(() => { localStorage.setItem("trivia_q_dur", questionDuration); }, [questionDuration]);
  useEffect(() => { localStorage.setItem("trivia_res_dur", resultDuration); }, [resultDuration]);
  useEffect(() => { localStorage.setItem("trivia_vote_dur", votingDuration); }, [votingDuration]);
  useEffect(() => { localStorage.setItem("trivia_reveal_delay", revealDelay); }, [revealDelay]);
  useEffect(() => { localStorage.setItem("trivia_eval_delay", evalDelay); }, [evalDelay]);
  useEffect(() => { localStorage.setItem("trivia_voting_res_delay", votingResultDelay); }, [votingResultDelay]);
  useEffect(() => { localStorage.setItem("trivia_wheel_res_delay", wheelResultDelay); }, [wheelResultDelay]); 

  const getEngine = useCallback(() => engineRef.current || {}, [engineRef]);

  // React phase is the source of truth (not a possibly-stale engineRef snapshot)
  useEffect(() => {
    phaseRef.current = phase || "idle";
  }, [phase]);

  const trackTimeout = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      trackedTimeoutsRef.current.delete(id);
      fn();
    }, ms);
    trackedTimeoutsRef.current.add(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    if (votingTimerRef.current) clearInterval(votingTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    votingTimerRef.current = null;
    timerRef.current = null;
    graceTimerRef.current = null;
    revealTimerRef.current = null;
    trackedTimeoutsRef.current.forEach((id) => clearTimeout(id));
    trackedTimeoutsRef.current.clear();
  }, []);

  // Voting Interval — keyed off React `phase`, not engineRef
  useEffect(() => {
    if (phase !== "voting") return;

    setVotingTimeLeft(votingDuration);

    votingTimerRef.current = setInterval(() => {
      if (isPaused) return;
      if (phaseRef.current !== "voting") {
        clearInterval(votingTimerRef.current);
        votingTimerRef.current = null;
        return;
      }
      setVotingTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(votingTimerRef.current);
          votingTimerRef.current = null;
          queueMicrotask(() => {
            if (phaseRef.current === "voting" && getEngine().endVoting) {
              getEngine().endVoting();
            }
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (votingTimerRef.current) clearInterval(votingTimerRef.current);
      votingTimerRef.current = null;
    };
  }, [phase, isPaused, getEngine, votingDuration]); 

  // Question Interval
  useEffect(() => {
    if (phase !== "question") return;

    const maxT = getEngine().isCrazy ? Math.max(5, questionDuration - 5) : questionDuration;
    setTimeLeft(maxT);

    timerRef.current = setInterval(() => {
      if (isPaused) return;
      if (phaseRef.current !== "question") {
        clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          queueMicrotask(() => {
            if (phaseRef.current !== "question") return;
            const engine = getEngine();
            if (engine.setPhase) engine.setPhase("reveal");
            stopMusic();
            stopSpeaking();
            revealTimerRef.current = setTimeout(() => {
              if (phaseRef.current !== "reveal" && phaseRef.current !== "question") return;
              if (engine.setShowAnswer) engine.setShowAnswer(true);
              playSound(SOUNDS.correct);
            }, revealDelay);
            graceTimerRef.current = setTimeout(() => {
              if (phaseRef.current !== "reveal" && phaseRef.current !== "question") return;
              if (engine.evaluateRound) engine.evaluateRound();
            }, evalDelay);
          });
          return 0;
        }
        if (s === 5) {
          playSound(SOUNDS.timerWarning);
          addToast("⚠️ 5 ثواني متبقية للإجابة!", "warning");
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [phase, getEngine().isCrazy, addToast, questionDuration, isPaused, revealDelay, evalDelay, getEngine]);

  return {
    questionDuration, setQuestionDuration, resultDuration, setResultDuration,
    votingDuration, setVotingDuration,
    revealDelay, setRevealDelay, evalDelay, setEvalDelay,
    votingResultDelay, setVotingResultDelay, wheelResultDelay, setWheelResultDelay, timeLeft, setTimeLeft, 
    votingTimeLeft, setVotingTimeLeft, isPaused, setIsPaused,
    clearAllTimers, trackTimeout,
    voteDuration: votingDuration, setVoteDuration: setVotingDuration,
    voteTimeLeft: votingTimeLeft, setVoteTimeLeft: setVotingTimeLeft
  };
}
