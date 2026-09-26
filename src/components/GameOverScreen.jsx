// src/components/GameOverScreen.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { podiumItemAnim } from "../animations/podiumAnimations"; 

function formatScoreCompact(score) {
  if (!score || isNaN(score)) return "0";
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(score % 1_000_000 === 0 ? 0 : 1) + "M";
  if (score >= 1_000) return (score / 1_000).toFixed(score % 1_000 === 0 ? 0 : 1) + "K";
  return score.toString();
}

const ExtremeConfetti = () => {
  const particles = useMemo(() => {
    const colors = ["#ffd700", "#ff3333", "#2ecc71", "#3498db", "#e056fd", "#ffffff", "#ff9ff3"];
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      xOffset: (Math.random() - 0.5) * window.innerWidth * 1.5, 
      yOffset: window.innerHeight + Math.random() * 500, 
      delay: Math.random() * 0.4, 
      duration: 2 + Math.random() * 3,
      size: Math.random() > 0.5 ? 12 : 8,
      isCircle: Math.random() > 0.5,
      rotate: Math.random() * 720,
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', top: -50, left: '50%', zIndex: 9999, pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: p.xOffset, y: p.yOffset, opacity: [1, 1, 0], rotate: p.rotate, scale: 1 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{ width: p.size, height: p.size, backgroundColor: p.color, position: 'absolute', borderRadius: p.isCircle ? "50%" : "0%" }}
        />
      ))}
    </div>
  );
};

export default function GameOverScreen({ gameState }) {
  const { players, startVotingLikesGate, startVoting, startGame } = gameState;
  const [showConfetti, setShowConfetti] = useState(false);

  const sortedPlayers = Object.values(players || {}).sort((a, b) => b.score - a.score);
  const first = sortedPlayers[0]; 
  const highestScore = first ? first.score : 0;
  const topEarners = sortedPlayers.filter(p => p.score === highestScore && p.score > 0);
  const isMultipleWins = topEarners.length > 1;
  const hasScores = highestScore > 0;

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), hasScores ? 2500 : 800); 
    return () => clearTimeout(timer);
  }, [hasScores]);

  let headingText = "نهاية الرحلة";
  let subText = "أفضل النتائج في هذه الجولة";
  let headingColor = "#ffd700";
  let subColor = "#2ecc71";

  if (!hasScores) {
    headingText = "انتهت الجولة";
    subText = "لم يسجل أحد نقاطاً هذه المرة — حاول مرة أخرى!";
    headingColor = "#f1c40f";
    subColor = "#bdc3c7";
  } else if (isMultipleWins) {
    headingText = "الملايين المشتركون! 🏆";
    subText = `${topEarners.length} لاعبين تقاسموا صدارة الثروة!`;
    headingColor = "#ff9ff3";
    subColor = "#00cec9";
  } else if (first) {
    headingText = `🏆 بطل الجولة!`;
    subText = `تحية لـ ${first.name} تربع على العرش!`;
  }

  const renderSinglePodium = (player, rank) => {
    if (!player || player.score === 0) return <div style={{ flex: 1 }} />; 
    const isFirst = rank === 1;
    const height = isFirst ? "160px" : rank === 2 ? "120px" : "90px";
    const color = isFirst ? "#ffd700" : rank === 2 ? "#bdc3c7" : "#cd7f32";

    return (
      <motion.div 
        variants={podiumItemAnim(rank)} initial="hidden" animate="show"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "flex-end" }}
      >
        {isFirst && <div style={{ fontSize: "32px", marginBottom: "-10px", zIndex: 3 }}>👑</div>}
        <img 
          src={player.avatar} alt="" 
          style={{ width: isFirst ? "80px" : "60px", height: isFirst ? "80px" : "60px", borderRadius: "50%", border: `4px solid ${color}`, marginBottom: "10px", objectFit: "cover", boxShadow: `0 0 15px ${color}` }} 
          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "?")}`; }}
        />
        <div style={{ color: "#fff", fontWeight: "bold", fontSize: isFirst ? "18px" : "14px", textAlign: "center", width: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
        <div style={{ color, fontWeight: "900", fontSize: "16px", marginBottom: "10px" }}>{formatScoreCompact(player.score)} 💰</div>
        <div style={{ width: "85%", height, backgroundColor: color, borderTopLeftRadius: "10px", borderTopRightRadius: "10px", display: "flex", justifyContent: "center", paddingTop: "10px", backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(0,0,0,0.3))" }}>
          <span style={{ fontSize: "36px", fontWeight: "900", color: "rgba(0,0,0,0.4)" }}>{rank}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", paddingTop: "20px" }}>
      {showConfetti && <ExtremeConfetti />} 
      
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
        <h1 style={{ color: headingColor, margin: "0 0 10px 0", fontSize: "42px", textShadow: `0 0 20px ${headingColor}80` }}>{headingText}</h1>
        <div style={{ fontSize: "20px", color: subColor, fontWeight: "900", marginBottom: "20px" }}>{subText}</div>
      </motion.div>
      
      {!hasScores ? (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <span style={{ fontSize: "100px" }}>🎯</span>
        </motion.div>
      ) : isMultipleWins ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "center", gap: "15px", flex: 1, padding: "0 20px" }}>
          {topEarners.slice(0, 4).map((player, index) => (
            <motion.div 
              key={player.id} initial={{ opacity: 0, scale: 0.5, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: index * 0.3 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100px" }}
            >
              <div style={{ fontSize: "22px", marginBottom: "-5px" }}>⭐</div>
              <img 
                src={player.avatar} alt="" 
                style={{ width: "70px", height: "70px", borderRadius: "50%", border: "4px solid #00cec9", marginBottom: "8px", objectFit: "cover" }}
                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "?")}`; }}
              />
              <div style={{ color: "#fff", fontWeight: "bold", fontSize: "14px", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", width: "100%" }}>{player.name}</div>
              <div style={{ color: "#00cec9", fontWeight: "bold", fontSize: "14px" }}>{formatScoreCompact(player.score)} 💰</div>
              <div style={{ width: "100%", height: "110px", background: "linear-gradient(135deg, #00cec9, #0984e3)", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontWeight: "bold" }}>👑</div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "5px", flex: 1, padding: "0 20px", minHeight: "280px" }}>
          {renderSinglePodium(sortedPlayers[1], 2)}
          {renderSinglePodium(sortedPlayers[0], 1)}
          {renderSinglePodium(sortedPlayers[2], 3)}
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: hasScores ? 2.0 : 1.0 }} style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "30px", marginBottom: "20px" }}>
        <button className="btn-start" onClick={() => (startVotingLikesGate || startVoting)?.()} style={{background: "#8e44ad", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold"}}>🗳️ تصويت الجمهور</button>
        <button className="btn-start" onClick={() => startGame("mixed")} style={{background: "#2980b9", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold"}}>🎲 رحلة عشوائية</button>
      </motion.div>
    </div>
  );
}
