// src/components/Sidebar.jsx
import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import { resolveAnswerIndex } from "../utils/ArabicUtils";
import { setImgOfflineFallback } from "../utils/offlineAvatar";

function formatScoreCompact(score) {
  if (!score || isNaN(score)) return "0";
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(score % 1_000_000 === 0 ? 0 : 1) + "M";
  if (score >= 1_000) return (score / 1_000).toFixed(score % 1_000 === 0 ? 0 : 1) + "K";
  return String(score);
}

function resolveAnswerLabel(answer, q, shuffleMap) {
  if (!answer) return null;
  const choices = Array.isArray(q?.choices) ? q.choices : [];
  const originalIndex = resolveAnswerIndex(answer, choices, shuffleMap);
  if (originalIndex != null && choices[originalIndex] != null) {
    const useMap = Array.isArray(shuffleMap) && shuffleMap.length === choices.length;
    const displayIdx = useMap ? shuffleMap.indexOf(originalIndex) : originalIndex;
    return { num: displayIdx >= 0 ? displayIdx + 1 : null, text: String(choices[originalIndex]) };
  }
  return { num: null, text: String(answer) };
}

function avatarFallback(name, el) {
  setImgOfflineFallback(el, name, "2ecc71");
}

function statusMeta(player, phase) {
  const hasAnswer = !!player.currentAnswer;
  const isResult = phase === "result" || phase === "reveal" || phase === "gameover";

  if (isResult) {
    if (player.status === "correct") {
      return { label: "صح ✓", color: "#fff", bg: "#145a32", showAnswer: true };
    }
    if (player.status === "wrong") {
      return { label: "خطأ ✗", color: "#fff", bg: "#922b21", showAnswer: true };
    }
    if (!hasAnswer) {
      return { label: "صمت", color: "#fff", bg: "#566573", showAnswer: false };
    }
  }

  if (hasAnswer || player.status === "answered") {
    return { label: "أجاب", color: "#000", bg: "#5dade2", showAnswer: true };
  }

  if (phase === "question") {
    return { label: "ينتظر", color: "#fff", bg: "#424949", showAnswer: false };
  }

  return { label: "—", color: "#fff", bg: "#2c3e50", showAnswer: false };
}

/** Shrink font until text fits the container (1 line or N lines). */
function FitText({
  children,
  className,
  style,
  minPx = 11,
  maxPx = 22,
  lines = 1,
  title,
}) {
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(maxPx);
  const tip = title ?? (typeof children === "string" ? children : undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const LINE_HEIGHT = 1.25;

    const applyBase = (size) => {
      el.style.fontSize = `${size}px`;
      el.style.lineHeight = String(LINE_HEIGHT);
      el.style.overflow = "hidden";
      if (lines > 1) {
        el.style.display = "-webkit-box";
        el.style.webkitBoxOrient = "vertical";
        el.style.webkitLineClamp = String(lines);
        el.style.whiteSpace = "normal";
        el.style.wordBreak = "break-word";
        el.style.overflowWrap = "anywhere";
        el.style.maxHeight = `${lines * size * LINE_HEIGHT}px`;
        el.style.textOverflow = "ellipsis";
      } else {
        el.style.display = "block";
        el.style.webkitLineClamp = "unset";
        el.style.webkitBoxOrient = "unset";
        el.style.whiteSpace = "nowrap";
        el.style.wordBreak = "normal";
        el.style.overflowWrap = "normal";
        el.style.maxHeight = "none";
        el.style.textOverflow = "ellipsis";
      }
    };

    const overflows = () => {
      if (lines === 1) return el.scrollWidth > el.clientWidth + 1;
      // Without clamp temporarily, compare natural height to allowed box
      const allowed = lines * parseFloat(el.style.fontSize) * LINE_HEIGHT;
      el.style.webkitLineClamp = "unset";
      el.style.maxHeight = "none";
      void el.offsetHeight;
      const natural = el.scrollHeight;
      el.style.webkitLineClamp = String(lines);
      el.style.maxHeight = `${allowed}px`;
      return natural > allowed + 1;
    };

    const fit = () => {
      if (el.clientWidth < 8) return;

      let lo = minPx;
      let hi = maxPx;
      let best = minPx;

      // Prefer largest size that still fits
      applyBase(maxPx);
      void el.offsetWidth;
      if (!overflows()) {
        setFontSize(maxPx);
        applyBase(maxPx);
        return;
      }

      while (hi - lo > 0.4) {
        const mid = (lo + hi) / 2;
        applyBase(mid);
        void el.offsetWidth;
        if (overflows()) {
          hi = mid;
        } else {
          best = mid;
          lo = mid;
        }
      }

      applyBase(best);
      setFontSize(best);
    };

    fit();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    if (el.parentElement) ro?.observe(el.parentElement);

    return () => ro?.disconnect();
  }, [children, minPx, maxPx, lines]);

  return (
    <div
      ref={ref}
      className={className}
      title={tip}
      style={{
        ...style,
        fontSize,
        lineHeight: 1.25,
        overflow: "hidden",
        minWidth: 0,
        ...(lines === 1
          ? { whiteSpace: "nowrap", textOverflow: "ellipsis" }
          : {
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: lines,
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              maxHeight: `${lines * fontSize * 1.25}px`,
            }),
      }}
    >
      {children}
    </div>
  );
}

function AnswerRow({ player, phase, q, rank, shuffleMap }) {
  const meta = statusMeta(player, phase);
  const answer = meta.showAnswer ? resolveAnswerLabel(player.currentAnswer, q, shuffleMap) : null;
  const earned = phase === "result" && player.lastEarned > 0 ? player.lastEarned : 0;
  const answerDisplay = answer
    ? answer.num != null
      ? `${answer.num}️⃣ ${answer.text}`
      : answer.text
    : null;

  return (
    <div
      className="sidebar-person-row"
      style={{ borderColor: meta.bg }}
    >
      <div className="sidebar-person-rank" style={{ color: rank === 1 ? "#ffd700" : "#95a5a6" }}>
        {rank}
      </div>
      <img
        src={player.avatar}
        alt=""
        className="sidebar-person-avatar"
        onError={(e) => avatarFallback(player.name, e.target)}
      />
      <div className="sidebar-person-main">
        <div className="sidebar-person-name-row">
          <FitText
            className="sidebar-person-name"
            minPx={11}
            maxPx={20}
            lines={1}
          >
            {player.name}
          </FitText>
          {(player.streak || 0) >= 3 ? (
            <span className="sidebar-person-streak">🔥{player.streak}</span>
          ) : null}
        </div>
        {answerDisplay ? (
          <FitText
            className="sidebar-person-answer"
            minPx={10}
            maxPx={16}
            lines={2}
          >
            {answerDisplay}
          </FitText>
        ) : (
          <div className="sidebar-person-answer sidebar-muted">
            {phase === "question" ? "بانتظار الإجابة…" : "بدون إجابة"}
          </div>
        )}
      </div>
      <div className="sidebar-person-meta">
        <span
          className="sidebar-status-chip"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
        <span className="sidebar-person-score">
          {formatScoreCompact(player.score || 0)}
          {earned > 0 ? <span className="sidebar-earned">+{formatScoreCompact(earned)}</span> : null}
        </span>
      </div>
    </div>
  );
}

export default function Sidebar({
  players,
  phase,
  allTimeWinners,
  onAdjustWins,
  onClearAllTime,
  onDeleteWinner,
  onRefreshImages,
  qIdx = 0,
  questionList = [],
  winGoal = 2000,
  q = null,
  shuffleMap = null,
}) {
  const totalSteps = questionList?.length || 15;
  const currentStep = Math.min((qIdx || 0) + 1, totalSteps);
  const progressPct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  const sortedPlayers = useMemo(() => {
    const list = Object.values(players || {});
    const isLiveQ = phase === "question";
    return list.sort((a, b) => {
      if (isLiveQ) {
        const aAns = a.currentAnswer ? 1 : 0;
        const bAns = b.currentAnswer ? 1 : 0;
        if (aAns !== bAns) return bAns - aAns;
        if (aAns && bAns) return (b.answeredAtTime || 0) - (a.answeredAtTime || 0);
      }
      if (phase === "result" || phase === "reveal") {
        const rank = { correct: 0, wrong: 1, answered: 2, idle: 3 };
        const ar = rank[a.status] ?? 3;
        const br = rank[b.status] ?? 3;
        if (ar !== br) return ar - br;
      }
      return (b.score || 0) - (a.score || 0);
    });
  }, [players, phase]);

  const answeredCount = sortedPlayers.filter((p) => p.currentAnswer || p.status === "answered" || p.status === "correct" || p.status === "wrong").length;
  const waitingCount = Math.max(0, sortedPlayers.length - answeredCount);

  // Render only the top rows to keep long streams smooth; the rest are summarized.
  const MAX_VISIBLE_PLAYERS = 30;
  const visiblePlayers = sortedPlayers.slice(0, MAX_VISIBLE_PLAYERS);
  const overflowCount = Math.max(0, sortedPlayers.length - visiblePlayers.length);

  const sortedAllTimeWinners = [...(allTimeWinners || [])].sort(
    (a, b) => (b.wins || 0) - (a.wins || 0) || String(a.name || "").localeCompare(String(b.name || ""), "ar")
  );

  return (
    <div className="left-panels-wrapper sidebar-phone">
      <div className="leaderboard-column sidebar-live-panel">
        <div className="sidebar-live-header">
          <span className="sidebar-live-title">📡 اللاعبون</span>
          <span className="sidebar-live-count">
            {answeredCount} أجابوا
            {waitingCount > 0 && phase === "question" ? ` · ${waitingCount} ينتظرون` : ""}
          </span>
        </div>

        <div className="sidebar-progress-strip">
          <span>س {currentStep}/{totalSteps}</span>
          <span>معلم {formatScoreCompact(winGoal)}</span>
        </div>
        <div className="ladder-progress-bg sidebar-progress-bar">
          <div className="ladder-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="sidebar-people-scroll">
          {sortedPlayers.length === 0 ? (
            <div className="sidebar-empty-people">
              في انتظار إجابات الشات…
              <div>أرسل 1 أو 2 أو 3 أو 4 الآن</div>
            </div>
          ) : (
            <>
              {visiblePlayers.map((p, i) => (
                <AnswerRow key={p.id} player={p} phase={phase} q={q} rank={i + 1} shuffleMap={shuffleMap} />
              ))}
              {overflowCount > 0 ? (
                <div className="sidebar-empty-people" style={{ padding: "6px 0" }}>
                  …و{overflowCount} لاعب آخر
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="all-time-winners-column sidebar-kings-panel">
        <div className="all-time-header sidebar-kings-header">
          <div>
            <div className="sidebar-kings-title">👑 الملوك</div>
            <div className="sidebar-kings-sub">مرات الفوز</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {onRefreshImages && (
              <button type="button" className="clear-btn" onClick={onRefreshImages} style={{ color: "#3498db", borderColor: "#3498db", fontSize: "11px" }}>
                🔄
              </button>
            )}
            <button type="button" className="clear-btn" onClick={onClearAllTime} style={{ fontSize: "11px" }}>
              🗑
            </button>
          </div>
        </div>
        <div className="all-time-list sidebar-kings-scroll">
          {sortedAllTimeWinners.length === 0 ? (
            <div className="sidebar-empty-kings">الفائز بالجولة → +1 فوز</div>
          ) : (
            sortedAllTimeWinners.map((w, idx) => (
              <div key={w.id} className="all-time-row sidebar-king-row">
                <div className="rank" style={{ color: idx === 0 ? "#ffd700" : "#888" }}>#{idx + 1}</div>
                <img
                  src={w.avatar}
                  alt=""
                  className="avatar sidebar-king-avatar"
                  onError={(e) => avatarFallback(w.name, e.target)}
                />
                <div className="player-info" style={{ flex: 1, minWidth: 0 }}>
                  <FitText className="player-name sidebar-king-name" minPx={10} maxPx={15} lines={1}>
                    {w.name}
                  </FitText>
                </div>
                <div className="win-controls">
                  <button type="button" onClick={() => onAdjustWins?.(w.id, -1)} aria-label="إنقاص فوز">−</button>
                  <div className="win-count">{w.wins || 0}</div>
                  <button type="button" onClick={() => onAdjustWins?.(w.id, 1)} aria-label="زيادة فوز">+</button>
                  {onDeleteWinner && (
                    <button
                      type="button"
                      onClick={() => onDeleteWinner(w.id)}
                      aria-label="إزالة"
                      style={{ color: "#e74c3c", background: "rgba(231,76,60,0.15)" }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
