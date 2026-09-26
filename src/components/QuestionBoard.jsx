// src/components/QuestionBoard.jsx
import React from "react";
import GiftIcon from "./GiftIcon";
import { motion, AnimatePresence } from "framer-motion";
import { boardContainer, cardEntry, questionTextAnim } from "../animations/BoardAnimations";
import { getPointsForDifficulty, MAX_QUESTION_POINTS } from "../utils/QuestionManager.js";

const DIFF_META = {
  easy:   { label: "سهل",   color: "#2ecc71" },
  medium: { label: "متوسط", color: "#f1c40f" },
  hard:   { label: "صعب",   color: "#e67e22" },
  crazy:  { label: "جنوني", color: "#e74c3c" },
};

export default function QuestionBoard({ gameState }) { 
  const {
    q, qIdx, timeLeft, questionDuration, isCrazy,
    getRule, dragonActive, hiddenOptions = [], 
    isBlurred,
    phase,
    currentCategory,
    selectedCategory,
    showAnswer,
    shuffleMap,
    addTime,
  } = gameState;

  // 🛡️ FOOLPROOF VISUAL FALLBACK: Intercepts null exceptions or game-over updates instantly
  if (!q || !q.choices || q.choices.length === 0 || phase === "gameover") {
    const isGameOverPhase = phase === "gameover";

    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%", 
        width: "100%", 
        flexDirection: "column", 
        background: "#111723", 
        padding: "20px", 
        borderRadius: "12px", 
        textAlign: "center" 
      }}>
        <span style={{ fontSize: "74px", marginBottom: "15px" }}>
          {isGameOverPhase ? "🏆" : "🎮"}
        </span>
        <h2 style={{ 
          color: "#ffd700", 
          textShadow: "0 0 10px rgba(255,215,0,0.5)", 
          margin: "0 0 12px 0", 
          fontSize: "26px",
          fontWeight: "900"
        }}>
          {isGameOverPhase ? "انتهت الجولة!" : "جاري الاستعداد للجولة القادمة..."}
        </h2>
        <p style={{ color: "#fff", opacity: 0.8, fontSize: "16px", margin: 0, fontWeight: "bold" }}>
          {isGameOverPhase ? "تفقد لوحة النتائج النهائية." : "أرسل الفئة المفضلة لديك أو انتظر بدء اللعبة فوراً!"}
        </p>
      </div>
    );
  }

  const timeMax = isCrazy ? Math.max(5, questionDuration - 5) : questionDuration; 
  const choiceEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

  const displayChoices = shuffleMap
    ? shuffleMap.map(i => q.choices[i])
    : q.choices;

  const renderGiftIcon = (ruleName, size = 36) => {
    const rule = getRule(ruleName);
    if (!rule) return null;
    const px = typeof size === "string" ? parseInt(size, 10) || 36 : size;
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        أرسل{" "}
        <GiftIcon
          giftId={rule.giftId}
          size={px}
          style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.8))", transform: "scale(1.25)" }}
        />
      </div>
    );
  };

  // Classic scoring ONLY — never trust q.points (may be stale millionaire cache)
  const prizeValue = Math.min(MAX_QUESTION_POINTS, getPointsForDifficulty(q.difficulty));
  const diffMeta = DIFF_META[q.difficulty] || DIFF_META.easy;
  const stepNum = q.ladderStep || (qIdx + 1);
  const categoryLabel = currentCategory || selectedCategory || q.category || "";

  // 📐 SMART DYNAMIC FONT SIZING SCALER
  const qLen = q.q ? q.q.length : 0;
  let dynamicQFontSize = "2.35rem";
  if (qLen > 110) dynamicQFontSize = "1.5rem";
  else if (qLen > 70) dynamicQFontSize = "1.85rem";

  const getChoiceFontSize = (text) => {
    const len = text ? text.length : 0;
    if (len > 35) return "1.25rem";
    if (len > 20) return "1.5rem";
    return "1.85rem";
  };

  return (
    <div style={{ filter: isBlurred ? "blur(8px) grayscale(50%) contrast(1.2)" : "none", transition: "filter 0.5s", width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}> 
      
      <div className="trivia-header" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "140px" }}>
          <div className="question-counter" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#ffd700" }}>السؤال {stepNum} / 15</div>
          <div className="ladder-progress-bg" style={{ width: "140px" }}>
            <div className="ladder-progress-fill" style={{ width: `${Math.min(100, (stepNum / 15) * 100)}%` }} />
          </div>
          {categoryLabel ? (
            <div style={{ color: "#9bd1ff", fontSize: "12px", fontWeight: "800" }}>📁 {categoryLabel}</div>
          ) : null}
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {timeLeft <= (timeMax / 2) && getRule("add_time") && (
              <div className="action-hint pulse-time" style={{ margin: 0 }}>
                ⏳ +{getRule("add_time").value}ث {renderGiftIcon("add_time", "28px")}
              </div>
            )}
            <div className="timer-display" style={{ color: timeLeft <= 5 ? "#e74c3c" : "#ffd700" }}>
              ⏱ {timeLeft}
            </div>
            {phase === "question" && addTime && (
              <button
                type="button"
                onClick={() => addTime(5)}
                title="إضافة 5 ثوانٍ"
                style={{
                  background: "rgba(46, 204, 113, 0.2)",
                  border: "2px solid #2ecc71",
                  color: "#2ecc71",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "14px",
                  fontWeight: "900",
                  cursor: "pointer",
                  transition: "0.2s",
                  lineHeight: 1,
                }}
              >
                +5ث
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 15 }}>
        <div
          className="diff-badge"
          style={{
            background: diffMeta.color,
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
            padding: "10px 28px",
            borderRadius: "10px",
            fontSize: "1.35rem",
            fontWeight: "900",
            color: "#000",
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>{diffMeta.label}</span>
          <span style={{ opacity: 0.85 }}>|</span>
          <span>💰 {prizeValue} نقطة</span>
        </div>
      </div>

      <div className="timer-bar-bg">
        <div className="timer-bar-fill" style={{width: `${(timeLeft/timeMax)*100}%`, background: timeLeft<=5 ? "#e74c3c" : "#ffd700"}}/>
      </div>

      <motion.div 
        key={`text-${qIdx}`} 
        variants={questionTextAnim} 
        initial="hidden" 
        animate="show" 
        className="question-text" 
        style={{ 
          fontSize: dynamicQFontSize, 
          padding: "10px 0", 
          lineHeight: "1.4", 
          flex: "1 1 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}
      >
        {q.q}
      </motion.div>

      <motion.div 
        className="bgroup" 
        variants={boardContainer} 
        initial="hidden" 
        animate="show"
      >
        <AnimatePresence>
          {displayChoices.map((choice, idx) => {
            const isHidden = hiddenOptions.includes(choice);
            const isCorrect = showAnswer && choice === q.a;
            return (
              <motion.div 
                key={`${qIdx}-${idx}-${choice}`} 
                variants={cardEntry}
                className={`answer-box ${isCorrect ? "correct-box" : ""} ${isHidden ? "hidden-box" : ""} ${dragonActive ? "dragon-shake" : ""}`}
                style={{ fontSize: getChoiceFontSize(choice) }}
              >
                <span>
                  <span>{choiceEmojis[idx]}</span>
                  <span>{choice}</span>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
