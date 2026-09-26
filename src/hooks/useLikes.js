// src/hooks/useLikes.js
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

const GATE_TARGET_KEY = "trivia_like_gate_target";
const DEFAULT_GATE_TARGET = 5000;
const GATE_MODE_KEY = "trivia_gate_mode";
const DEFAULT_GATE_MODE = "both";
const GATE_EVERY_KEY = "trivia_gate_every";
const DEFAULT_GATE_EVERY = 3;
const VOTING_GATE_TITLE_KEY = "trivia_voting_gate_title";
const DEFAULT_VOTING_GATE_TITLE =
  "انتهت الجولة! نحتاج إعجابات لبدء التصويت على الفئة الجديدة";

export function useLikes({ addToast, onGateComplete } = {}) {
  const [sessionLikes, setSessionLikes] = useState(0);
  const [sessionGifts, setSessionGifts] = useState(0);
  const [gateBaseline, setGateBaseline] = useState(0);
  const [gateGiftBaseline, setGateGiftBaseline] = useState(0);
  const [gateTarget, setGateTarget] = useState(
    () => Number(localStorage.getItem(GATE_TARGET_KEY)) || DEFAULT_GATE_TARGET
  );
  const [gateActive, setGateActive] = useState(false);
  const [gateMode, setGateMode] = useState(
    () => localStorage.getItem(GATE_MODE_KEY) || DEFAULT_GATE_MODE
  );
  const [gateEvery, setGateEvery] = useState(
    () => Number(localStorage.getItem(GATE_EVERY_KEY)) || DEFAULT_GATE_EVERY
  );
  /** Ladder step that opened the gate (5 or 10) — for mid-round UI copy */
  const [gateStep, setGateStep] = useState(null);
  /** 'checkpoint' after Q5/Q10, 'voting' before category vote */
  const [gateKind, setGateKind] = useState(null);

  const [likesEnabled, setLikesEnabled] = useState(
    () => localStorage.getItem("trivia_likes_enabled") !== "false"
  );
  const [likesLabel, setLikesLabel] = useState(
    () => localStorage.getItem("trivia_likes_label") || "❤️ اضغط على الشاشة لدعم البث ❤️"
  );
  const [votingGateTitle, setVotingGateTitle] = useState(
    () => localStorage.getItem(VOTING_GATE_TITLE_KEY) || DEFAULT_VOTING_GATE_TITLE
  );

  useEffect(() => {
    localStorage.setItem(GATE_TARGET_KEY, String(gateTarget));
  }, [gateTarget]);
  useEffect(() => {
    localStorage.setItem(GATE_MODE_KEY, gateMode);
  }, [gateMode]);
  useEffect(() => {
    localStorage.setItem(GATE_EVERY_KEY, String(gateEvery));
  }, [gateEvery]);
  useEffect(() => {
    localStorage.setItem("trivia_likes_enabled", String(likesEnabled));
  }, [likesEnabled]);
  useEffect(() => {
    localStorage.setItem("trivia_likes_label", likesLabel);
  }, [likesLabel]);
  useEffect(() => {
    localStorage.setItem(VOTING_GATE_TITLE_KEY, votingGateTitle);
  }, [votingGateTitle]);

  const sessionLikesRef = useRef(0);
  const gateBaselineRef = useRef(0);
  const gateTargetRef = useRef(gateTarget);
  const gateActiveRef = useRef(false);
  const gateKindRef = useRef(null);
  const completingRef = useRef(false);
  const onGateCompleteRef = useRef(onGateComplete);

  useEffect(() => {
    sessionLikesRef.current = sessionLikes;
  }, [sessionLikes]);
  useEffect(() => {
    gateBaselineRef.current = gateBaseline;
  }, [gateBaseline]);
  useEffect(() => {
    gateTargetRef.current = gateTarget;
  }, [gateTarget]);
  useEffect(() => {
    gateActiveRef.current = gateActive;
  }, [gateActive]);
  useEffect(() => {
    gateKindRef.current = gateKind;
  }, [gateKind]);
  useEffect(() => {
    onGateCompleteRef.current = onGateComplete;
  }, [onGateComplete]);

  const gateProgress = useMemo(() => {
    if (!gateActive) return 0;

    const likesProgress = Math.max(0, sessionLikes - gateBaseline);
    const giftProgress = Math.max(0, sessionGifts - gateGiftBaseline);

    if (gateMode === "likes") {
      return Math.min(likesProgress, gateTarget);
    }
    if (gateMode === "gifts") {
      return Math.min(giftProgress, gateTarget);
    }

    return Math.min(likesProgress + giftProgress, gateTarget);
  }, [gateActive, sessionLikes, sessionGifts, gateBaseline, gateGiftBaseline, gateMode, gateTarget]);

  const gateRemaining = useMemo(() => {
    if (!gateActive) return 0;

    const likesProgress = Math.max(0, sessionLikes - gateBaseline);
    const giftProgress = Math.max(0, sessionGifts - gateGiftBaseline);

    if (gateMode === "likes") {
      return Math.max(0, gateTarget - likesProgress);
    }
    if (gateMode === "gifts") {
      return Math.max(0, gateTarget - giftProgress);
    }

    return Math.max(0, gateTarget - (likesProgress + giftProgress));
  }, [gateActive, sessionLikes, sessionGifts, gateBaseline, gateGiftBaseline, gateMode, gateTarget]);

  const resetSessionLikes = useCallback(() => {
    setSessionLikes(0);
    sessionLikesRef.current = 0;
    setSessionGifts(0);
    setGateBaseline(0);
    gateBaselineRef.current = 0;
    setGateGiftBaseline(0);
    setGateActive(false);
    gateActiveRef.current = false;
    setGateStep(null);
    setGateKind(null);
    gateKindRef.current = null;
    completingRef.current = false;
  }, []);

  const restoreLikesState = useCallback((snapshot = {}) => {
    const likes = Math.max(0, Number(snapshot.sessionLikes) || 0);
    const gifts = Math.max(0, Number(snapshot.sessionGifts) || 0);
    const baseline = Math.max(0, Number(snapshot.gateBaseline) || 0);
    const giftBaseline = Math.max(0, Number(snapshot.gateGiftBaseline) || 0);
    const active = Boolean(snapshot.gateActive);
    const step =
      snapshot.gateStep === 5 || snapshot.gateStep === 10
        ? snapshot.gateStep
        : null;
    const kind =
      snapshot.gateKind === "voting" || snapshot.gateKind === "checkpoint"
        ? snapshot.gateKind
        : active
          ? "checkpoint"
          : null;

    setSessionLikes(likes);
    sessionLikesRef.current = likes;
    setSessionGifts(gifts);
    setGateBaseline(baseline);
    gateBaselineRef.current = baseline;
    setGateGiftBaseline(giftBaseline);
    setGateActive(active);
    gateActiveRef.current = active;
    setGateStep(step);
    setGateKind(kind);
    gateKindRef.current = kind;
    completingRef.current = false;
  }, []);

  const finishGate = useCallback((skipped = false) => {
    if (!gateActiveRef.current || completingRef.current) return;
    completingRef.current = true;
    const kind = gateKindRef.current;
    setGateActive(false);
    gateActiveRef.current = false;
    setGateStep(null);
    setGateKind(null);
    gateKindRef.current = null;

    if (typeof addToast === "function") {
      const voting = kind === "voting";
      addToast(
        skipped
          ? voting
            ? "⏭️ تم تخطي بوابة التصويت"
            : "⏭️ تم تخطي محطة الإعجابات"
          : voting
            ? "🎉 اكتملت الإعجابات! نبدأ التصويت على الفئة"
            : "🎉 محطة الإعجابات اكتملت! ننتقل للسؤال التالي",
        "success"
      );
    }

    const cb = onGateCompleteRef.current;
    if (typeof cb === "function") {
      setTimeout(() => {
        completingRef.current = false;
        cb({ skipped, kind });
      }, 0);
    } else {
      completingRef.current = false;
    }
  }, [addToast]);

  /**
   * @param {number|null|{ step?: number|null, kind?: 'checkpoint'|'voting' }} stepOrOpts
   */
  const startLikesGate = useCallback((stepOrOpts = null) => {
    const opts =
      stepOrOpts != null && typeof stepOrOpts === "object"
        ? stepOrOpts
        : { step: stepOrOpts, kind: "checkpoint" };
    const step = opts.step === 5 || opts.step === 10 ? opts.step : null;
    const kind = opts.kind === "voting" ? "voting" : "checkpoint";

    const baseline = sessionLikesRef.current;
    setGateBaseline(baseline);
    gateBaselineRef.current = baseline;
    setGateGiftBaseline(sessionGifts);
    setGateActive(true);
    gateActiveRef.current = true;
    setGateStep(step);
    setGateKind(kind);
    gateKindRef.current = kind;
    completingRef.current = false;
  }, [sessionGifts]);

  const addGiftRequest = useCallback((amount = 1) => {
    if (!likesEnabled) return;
    const next = Math.max(0, Number(amount) || 0);
    if (next <= 0) return;

    setSessionGifts((prev) => {
      const updated = prev + next;
      return updated;
    });
  }, [likesEnabled]);

  const forceCompleteLikesGate = useCallback(() => {
    if (!gateActiveRef.current) return;

    const likesProgress = Math.max(0, sessionLikesRef.current - gateBaselineRef.current);
    const giftProgress = Math.max(0, sessionGifts - gateGiftBaseline);
    const combined = gateMode === "gifts" ? giftProgress : gateMode === "likes" ? likesProgress : likesProgress + giftProgress;
    const needed = Math.max(0, gateTargetRef.current - combined);

    if (needed > 0) {
      if (gateMode === "gifts") {
        setSessionGifts((prev) => {
          const next = prev + needed;
          return next;
        });
      } else if (gateMode === "likes") {
        setSessionLikes((prev) => {
          const next = prev + needed;
          sessionLikesRef.current = next;
          return next;
        });
      } else {
        setSessionLikes((prev) => {
          const next = prev + needed;
          sessionLikesRef.current = next;
          return next;
        });
        setSessionGifts((prev) => prev + needed);
      }
    }

    finishGate(false);
  }, [finishGate, gateMode, sessionGifts, gateGiftBaseline]);

  const skipLikesGate = useCallback(() => {
    if (!gateActiveRef.current) return;
    finishGate(true);
  }, [finishGate]);

  const addManualLikes = useCallback(
    (amount) => {
      if (!likesEnabled) return;
      const delta = Number(amount) || 0;
      if (delta <= 0) return;

      setSessionLikes((prev) => {
        const newTotal = prev + delta;
        sessionLikesRef.current = newTotal;
        return newTotal;
      });
    },
    [likesEnabled]
  );

  useEffect(() => {
    if (
      gateActiveRef.current &&
      !completingRef.current &&
      gateProgress >= gateTargetRef.current
    ) {
      setTimeout(() => finishGate(false), 0);
    }
  }, [gateProgress, finishGate]);

  // Aliases for existing UI props (session total replaces per-question counter)
  const globalLikes = sessionLikes;
  const setGlobalLikes = setSessionLikes;

  return {
    sessionLikes,
    setSessionLikes,
    sessionGifts,
    setSessionGifts,
    globalLikes,
    setGlobalLikes,
    gateBaseline,
    gateTarget,
    setGateTarget,
    gateActive,
    gateStep,
    gateKind,
    gateProgress,
    gateRemaining,
    gateMode,
    setGateMode,
    gateEvery,
    setGateEvery,
    likesEnabled,
    setLikesEnabled,
    likesLabel,
    setLikesLabel,
    votingGateTitle,
    setVotingGateTitle,
    addManualLikes,
    addGiftRequest,
    startLikesGate,
    forceCompleteLikesGate,
    skipLikesGate,
    resetSessionLikes,
    restoreLikesState,
  };
}
