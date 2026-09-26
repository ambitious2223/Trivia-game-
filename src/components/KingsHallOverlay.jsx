// Full-screen Hall of Kings showcase - all-time winners with big photos + slide-in ranks.
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { offlineAvatarDataUri } from "../utils/offlineAvatar";

function rankMedal(rank) {
  if (rank === 1) return { emoji: "🥇", color: "#ffd700", glow: "rgba(255,215,0,0.55)" };
  if (rank === 2) return { emoji: "🥈", color: "#c0c0c0", glow: "rgba(192,192,192,0.4)" };
  if (rank === 3) return { emoji: "🥉", color: "#cd7f32", glow: "rgba(205,127,50,0.4)" };
  return { emoji: `#${rank}`, color: "#7f8c8d", glow: "rgba(255,215,0,0.12)" };
}

function avatarSize(rank) {
  if (rank === 1) return 220;
  if (rank === 2) return 160;
  if (rank === 3) return 140;
  return 110;
}

export default function KingsHallOverlay({ open, winners = [], onClose }) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const userInteracted = useRef(false);
  const sorted = useMemo(
    () =>
      [...(winners || [])].sort(
        (a, b) =>
          (b.wins || 0) - (a.wins || 0) ||
          String(a.name || "").localeCompare(String(b.name || ""), "ar")
      ),
    [winners]
  );

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const el = trackRef.current;
    if (!el) return undefined;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [open, sorted.length, updateScrollState]);

  const scrollByAmount = useCallback((direction) => {
    const el = trackRef.current;
    if (!el) return;
    userInteracted.current = true;
    const cardWidth = 200;
    el.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Slow horizontal parade when there are many kings
  useEffect(() => {
    const el = trackRef.current;
    if (!open || sorted.length < 4 || !el) return undefined;
    if (el.scrollWidth <= el.clientWidth) return undefined;

    let raf = 0;
    let x = 0;
    const speed = 0.35;
    const tick = () => {
      if (userInteracted.current) return;
      x += speed;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      if (max > 0) {
        if (x >= max) x = 0;
        el.scrollLeft = x;
      }
      raf = requestAnimationFrame(tick);
    };
    const start = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 2800);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, [open, sorted.length]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="kings-hall"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="قاعة الملوك"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="kings-hall-bg" aria-hidden="true" />
          <div className="kings-hall-sparkles" aria-hidden="true" />

          <button type="button" className="kings-hall-close" onClick={onClose} aria-label="إغلاق">
            ✕ إغلاق
          </button>

          <motion.header
            className="kings-hall-header"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 160, damping: 18 }}
          >
            <div className="kings-hall-crown">👑</div>
            <h1 className="kings-hall-title">قاعة الملوك</h1>
            <p className="kings-hall-sub">أساطير الفوز عبر كل الجولات</p>
          </motion.header>

          {sorted.length === 0 ? (
            <motion.div
              className="kings-hall-empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              لا يوجد ملوك بعد — الفائز بالجولة يدخل القاعة
            </motion.div>
          ) : (
            <div className="kings-hall-stage">
              {canScrollLeft && (
                <button
                  type="button"
                  className="kings-hall-arrow kings-hall-arrow--left"
                  onClick={() => scrollByAmount(-1)}
                  aria-label="Scroll left"
                >
                  ❮
                </button>
              )}
              <div className="kings-hall-track" ref={trackRef}>
                {sorted.map((w, idx) => {
                  const rank = idx + 1;
                  const medal = rankMedal(rank);
                  const size = avatarSize(rank);
                  const src =
                    w.avatar || offlineAvatarDataUri(w.name || "?", "ffd700", "000000");
                  return (
                    <motion.article
                      key={w.id}
                      className={`kings-hall-card ${rank <= 3 ? `kings-hall-card--top${rank}` : ""}`}
                      initial={{ opacity: 0, x: 120, scale: 0.82, rotate: 4 }}
                      animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.35 + idx * 0.22,
                        type: "spring",
                        stiffness: 110,
                        damping: 16,
                      }}
                      style={{
                        ["--king-glow"]: medal.glow,
                        ["--king-accent"]: medal.color,
                      }}
                    >
                      <div className="kings-hall-rank" style={{ color: medal.color }}>
                        {medal.emoji}
                      </div>
                      {rank === 1 && (
                        <motion.div
                          className="kings-hall-floating-crown"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          👑
                        </motion.div>
                      )}
                      <motion.img
                        className="kings-hall-avatar"
                        src={src}
                        alt=""
                        width={size}
                        height={size}
                        style={{ width: size, height: size }}
                        initial={{ scale: 0.5, filter: "blur(8px)" }}
                        animate={{ scale: 1, filter: "blur(0px)" }}
                        transition={{ delay: 0.45 + idx * 0.22, type: "spring", stiffness: 140 }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = offlineAvatarDataUri(w.name || "?", "ffd700", "000000");
                        }}
                      />
                      <div className="kings-hall-name">{w.name}</div>
                      <div className="kings-hall-wins">
                        <span className="kings-hall-wins-num">{w.wins || 0}</span>
                        <span className="kings-hall-wins-label">فوز</span>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
              {canScrollRight && (
                <button
                  type="button"
                  className="kings-hall-arrow kings-hall-arrow--right"
                  onClick={() => scrollByAmount(1)}
                  aria-label="Scroll right"
                >
                  ❯
                </button>
              )}
            </div>
          )}

          <motion.footer
            className="kings-hall-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            اضغط Esc أو إغلاق للعودة
          </motion.footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
