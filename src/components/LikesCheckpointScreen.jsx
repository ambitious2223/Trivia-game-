import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { offlineAvatarDataUri } from "../utils/offlineAvatar";

function formatLikes(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}K`;
  return v.toLocaleString("en-US");
}

function formatScore(score) {
  const v = Math.max(0, Number(score) || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return String(v);
}

export default function LikesCheckpointScreen({ gameState }) {
  const {
    sessionLikes = 0,
    globalLikes = 0,
    gateTarget = 5000,
    gateProgress = 0,
    gateRemaining = 0,
    gateStep = null,
    gateKind = null,
    gateWinner = null,
    likesLabel,
    votingGateTitle,
  } = gameState;

  const isVotingGate = gateKind === "voting";
  const total = sessionLikes || globalLikes || 0;
  const target = Math.max(1, Number(gateTarget) || 5000);
  const progress = Math.min(Math.max(0, Number(gateProgress) || 0), target);
  const remaining = Math.max(0, Number(gateRemaining) || 0);
  const pct = Math.min(100, (progress / target) * 100);

  const headline = isVotingGate
    ? votingGateTitle || "انتهت الجولة! نحتاج إعجابات لبدء التصويت على الفئة الجديدة"
    : gateStep === 10
      ? "محطة الإعجابات — بعد السؤال 10"
      : gateStep === 5
        ? "محطة الإعجابات — بعد السؤال 5"
        : "محطة الإعجابات";

  const subline = isVotingGate
    ? `نحتاج +${formatLikes(remaining || target)} إعجاب لفتح التصويت على الفئة الجديدة`
    : likesLabel || "اضغط على الشاشة لدعم البث";

  const hearts = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${6 + ((i * 7) % 88)}%`,
        delay: (i % 7) * 0.35,
        duration: 3.2 + (i % 5) * 0.45,
        size: 18 + (i % 4) * 8,
        opacity: 0.25 + (i % 5) * 0.1,
      })),
    []
  );

  const ringR = 54;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - pct / 100);

  return (
    <div className={`likes-checkpoint ${isVotingGate ? "likes-checkpoint--voting" : ""}`} dir="rtl">
      <div className="likes-checkpoint-rain" aria-hidden="true">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="likes-checkpoint-heart-fall"
            style={{
              left: h.left,
              fontSize: `${h.size}px`,
              animationDelay: `${h.delay}s`,
              animationDuration: `${h.duration}s`,
              opacity: h.opacity,
            }}
          >
            ❤
          </span>
        ))}
      </div>

      <motion.div
        className="likes-checkpoint-inner"
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        {!isVotingGate && (
          <motion.div
            className="likes-checkpoint-pulse-hearts"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            <span>❤️</span>
            <span>💖</span>
            <span>❤️</span>
          </motion.div>
        )}

        <motion.h2
          className="likes-checkpoint-title"
          initial={{ y: 24, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 16 }}
        >
          {headline}
        </motion.h2>

        {isVotingGate && gateWinner && (
          <motion.div
            className="likes-checkpoint-winner"
            initial={{ y: 18, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, type: "spring", stiffness: 240, damping: 16 }}
          >
            <div className="likes-checkpoint-winner-crown">👑 بطل الجولة</div>
            <motion.img
              className="likes-checkpoint-winner-avatar"
              src={gateWinner.avatar || offlineAvatarDataUri(gateWinner.name || "?", "ffd700", "000000")}
              alt=""
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = offlineAvatarDataUri(gateWinner.name || "?", "ffd700", "000000");
              }}
            />
            <div className="likes-checkpoint-winner-name">{gateWinner.name}</div>
            {gateWinner.score > 0 && (
              <div className="likes-checkpoint-winner-score">
                {formatScore(gateWinner.score)} نقطة
              </div>
            )}
          </motion.div>
        )}

        {isVotingGate && !gateWinner && (
          <p className="likes-checkpoint-sub">انتهت الجولة — لا بطل هذه المرة</p>
        )}

        <p className="likes-checkpoint-sub">{subline}</p>

        <div className="likes-checkpoint-ring-wrap">
          <svg className="likes-checkpoint-ring" viewBox="0 0 140 140" aria-hidden="true">
            <circle className="likes-checkpoint-ring-track" cx="70" cy="70" r={ringR} />
            <motion.circle
              className="likes-checkpoint-ring-fill"
              cx="70"
              cy="70"
              r={ringR}
              strokeDasharray={ringC}
              strokeDashoffset={ringOffset}
              initial={false}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </svg>
          <div className="likes-checkpoint-ring-label">
            <span className="likes-checkpoint-ring-pct">{Math.round(pct)}%</span>
            <span className="likes-checkpoint-ring-frac">
              {formatLikes(progress)} / {formatLikes(target)}
            </span>
          </div>
        </div>

        <div className="likes-checkpoint-bar-bg">
          <motion.div
            className="likes-checkpoint-bar-fill"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
          />
        </div>

        <motion.div
          className="likes-checkpoint-remaining"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
        >
          باقي <strong>+{formatLikes(remaining)}</strong> إعجاب
          {isVotingGate ? " لفتح التصويت" : ""}
        </motion.div>

        <div className="likes-checkpoint-session">
          إجمالي الجلسة: <strong>{formatLikes(total)}</strong> ❤️
        </div>
      </motion.div>
    </div>
  );
}
