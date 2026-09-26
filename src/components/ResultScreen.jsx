// src/components/ResultScreen.jsx
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Pick avatar size + columns that best fill the box without overflowing. */
function fitWinnerAvatars(width, height, count) {
  if (!count || width < 40 || height < 40) {
    return { size: 72, cols: 1, gap: 12, nameSize: 12, border: 3 };
  }

  const minSize = 40;
  const maxSize = Math.min(220, Math.floor(Math.min(width, height) * 0.92));
  let best = { size: minSize, cols: count, gap: 8, nameSize: 11, border: 3 };

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);

    // Gap scales with how many cells we have — denser grids get tighter gaps
    const gap = cols >= 5 || rows >= 4 ? 8 : cols >= 3 || rows >= 3 ? 12 : 18;
    const nameGap = Math.max(4, Math.round(gap * 0.45));

    // Name line is proportional to avatar; solve for avatar size that fits both axes
    // cellH = size + nameGap + nameH, nameH ≈ size * 0.22 (clamped)
    // size + nameGap + clamp(0.18*size, 11, 28) <= available row height
    const availW = (width - gap * (cols - 1)) / cols;
    const availH = (height - gap * (rows - 1)) / rows;

    // Binary-ish: try size from max down via formula
    // availH >= size + nameGap + nameH(size)
    // nameH = min(28, max(11, size * 0.2))
    let lo = minSize;
    let hi = Math.min(maxSize, Math.floor(availW));
    let size = minSize;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const nameH = Math.min(28, Math.max(11, Math.round(mid * 0.2)));
      const cellH = mid + nameGap + nameH;
      if (cellH <= availH && mid <= availW) {
        size = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (size > best.size) {
      const nameSize = Math.min(28, Math.max(11, Math.round(size * 0.2)));
      const border = size >= 140 ? 7 : size >= 100 ? 5 : size >= 70 ? 4 : 3;
      best = { size, cols, gap, nameSize, border };
    }
  }

  return best;
}

function WinnersAvatarGrid({ players }) {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({ size: 96, cols: 1, gap: 14, nameSize: 14, border: 4 });

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setLayout(fitWinnerAvatars(width, height, players.length));
  }, [players.length]);

  useLayoutEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const { size, cols, gap, nameSize, border } = layout;

  return (
    <div
      ref={containerRef}
      className="winners-avatar-container"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gap: `${gap}px`,
        justifyContent: "center",
        alignContent: "center",
        justifyItems: "center",
      }}
    >
      {players.map((p, i) => (
        <div
          key={p.id}
          className="winner-avatar-wrapper"
          style={{
            animationDelay: `${i * 0.05}s`,
            gap: `${Math.max(4, Math.round(gap * 0.45))}px`,
            width: size,
          }}
        >
          <img
            src={p.avatar}
            alt=""
            className="winner-avatar"
            style={{
              width: size,
              height: size,
              borderWidth: border,
              boxShadow:
                size >= 140
                  ? "0 0 40px rgba(46, 204, 113, 1)"
                  : size >= 90
                    ? "0 0 24px rgba(46, 204, 113, 0.85)"
                    : "0 0 14px rgba(46, 204, 113, 0.65)",
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || "U")}`;
            }}
          />
          <div
            className="winner-name-mini"
            style={{
              fontSize: nameSize,
              maxWidth: size,
            }}
          >
            {p.name}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ResultScreen({ gameState }) {
  const { q, players } = gameState;
  const [showNewRanks, setShowNewRanks] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowNewRanks(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!q) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
          flexDirection: "column",
          background: "#111723",
          color: "#fff",
          padding: "20px",
        }}
      >
        <h2 style={{ color: "#3498db" }}>جاري مراجعة نتائج الجولة الحالية...</h2>
      </div>
    );
  }

  const correctPlayers = Object.values(players || {})
    .filter((p) => p.status === "correct")
    .sort((a, b) => b.score - a.score);

  const displayPlayers = Object.values(players || {})
    .map((p) => ({
      ...p,
      currentDisplayScore: showNewRanks ? p.score : p.lastScore !== undefined ? p.lastScore : p.score,
    }))
    .sort((a, b) => b.currentDisplayScore - a.currentDisplayScore);

  return (
    <div className="result-screen-showcase">
      <div
        style={{
          color: "#2ecc71",
          fontWeight: 900,
          fontSize: "22px",
          marginBottom: "10px",
          lineHeight: 1.3,
          flexShrink: 0,
        }}
      >
        ✅ الإجابة الصحيحة: {q.a}
      </div>

      <div className="result-screen-body">
        <div className="round-winners-box">
          <div
            style={{
              color: "#ffd700",
              fontSize: "18px",
              marginBottom: "10px",
              fontWeight: 900,
              textShadow: "0 0 10px rgba(255,215,0,0.5)",
              flexShrink: 0,
            }}
          >
            🌟 الإجابات الصحيحة
          </div>
          {correctPlayers.length > 0 ? (
            <WinnersAvatarGrid players={correctPlayers} />
          ) : (
            <div style={{ color: "#aaa", fontSize: "16px", margin: "auto" }}>لا توجد إجابات صحيحة 😢</div>
          )}
        </div>

        <div className="leaderboard-updates-box">
          <div
            style={{
              color: "#3498db",
              fontSize: "18px",
              marginBottom: "10px",
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            📈 صدارة الترتيب
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              position: "relative",
              paddingRight: "5px",
            }}
          >
            <AnimatePresence>
              {displayPlayers.map((p, i) => (
                <motion.div
                  layout
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: i === 0 ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: i === 0 ? "1px solid rgba(255,215,0,0.4)" : "1px solid transparent",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: "14px",
                      color: i === 0 ? "#ffd700" : i === 1 ? "#bdc3c7" : i === 2 ? "#cd7f32" : "#fff",
                      width: "24px",
                    }}
                  >
                    #{i + 1}
                  </div>
                  <img
                    src={p.avatar}
                    alt=""
                    style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0 }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || "U")}`;
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textAlign: "right",
                    }}
                  >
                    {p.name}
                    {(p.streak || 0) >= 3 && <span className="player-streak"> 🔥{p.streak}</span>}
                  </div>

                  {showNewRanks && p.lastEarned > 0 && (
                    <div className="earned-flash-inline">
                      +{p.lastEarned}
                      {p.speedBonus > 1 ? ` x${p.speedBonus}` : ""}
                    </div>
                  )}

                  <div style={{ color: i === 0 ? "#ffd700" : "#2ecc71", fontWeight: 900, fontSize: "14px" }}>
                    {p.currentDisplayScore}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
