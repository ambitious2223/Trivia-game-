// src/components/CategoryWheel.jsx
import React, { useState, useEffect } from 'react';
import { SOUNDS, playSound } from '../utils/Sounds';

export default function CategoryWheel({ categories, isSpinning, selectedCategory }) {
  const [rotation, setRotation] = useState(0);

  const colors = ["#e74c3c", "#3498db", "#9b59b6", "#2ecc71", "#f39c12", "#16a085", "#d35400", "#2980b9"];
  const sliceAngle = 360 / categories.length;

  useEffect(() => {
    if (isSpinning) {
      // Rapid fake spins while the engine decides
      setRotation(prev => prev + 1800); 
    } else if (selectedCategory) {
      // The engine picked a winner! Calculate exact landing angle for smooth deceleration
      const index = categories.indexOf(selectedCategory);
      const sliceCenter = (index * sliceAngle) + (sliceAngle / 2);
      
      setRotation(prev => {
        const currentMod = prev % 360;
        // Snap to nearest 360, add 2 extra slowdown spins, and offset by slice center
        return prev - currentMod + 720 + (360 - sliceCenter);
      });
    }
  }, [isSpinning, selectedCategory, categories, sliceAngle]);

  // Optional tick sound
  useEffect(() => {
    let interval;
    if (isSpinning) {
      interval = setInterval(() => {
        if (SOUNDS.tick) playSound(SOUNDS.tick);
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isSpinning]);

  const gradientStops = categories.map((cat, i) => {
    return `${colors[i % colors.length]} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`;
  }).join(", ");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto', direction: 'ltr' }}>
      <style>
        {`
          @keyframes pointer-tick {
            0% { transform: translateX(-50%) rotate(0deg); }
            50% { transform: translateX(-50%) rotate(-20deg); }
            100% { transform: translateX(-50%) rotate(0deg); }
          }
          /* FIXED: Added pop-in animation for the bottom winner banner */
          @keyframes pop-in-winner {
            0% { transform: scale(0.5) translateY(-20px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
        `}
      </style>
      
      <h2 style={{ fontSize: "36px", color: "#ffd700", marginBottom: "40px", textShadow: "0 0 15px rgba(255,215,0,0.5)" }}>
         {isSpinning ? "🎲 جاري سحب الفئة..." : "✨ الفئة المختارة! ✨"}
      </h2>

      <div style={{ position: "relative", width: "400px", height: "400px" }}>
        
        {/* The Ticking Pointer */}
        <div style={{
          position: "absolute", top: "-30px", left: "50%",
          width: 0, height: 0, borderLeft: "25px solid transparent", borderRight: "25px solid transparent", borderTop: "50px solid white",
          zIndex: 10, filter: "drop-shadow(0 5px 10px rgba(0,0,0,0.8))",
          transformOrigin: "top center",
          animation: isSpinning ? "pointer-tick 0.15s linear infinite" : "none",
          transform: "translateX(-50%) rotate(0deg)"
        }} />

        {/* The Physical Wheel */}
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%", position: "relative", overflow: "hidden",
          border: "10px solid white", boxShadow: "0 0 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.5)",
          background: `conic-gradient(${gradientStops})`,
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? "transform 2s linear" : "transform 1.5s cubic-bezier(0.1, 0.7, 0.1, 1)"
        }}>
          {categories.map((cat, i) => {
            const angle = (i * sliceAngle) + (sliceAngle / 2);
            return (
              <div key={i} style={{
                position: "absolute", top: "50%", left: "50%",
                width: "50%", height: "40px", marginTop: "-20px",
                transformOrigin: "left center",
                transform: `rotate(${angle - 90}deg) translateX(30px)`,
                display: "flex", alignItems: "center", color: "white",
                // FIXED: Shrink font size if there are too many categories, and cut off long text so it doesn't bleed into the center
                fontWeight: "900", fontSize: categories.length > 20 ? "11px" : categories.length > 12 ? "15px" : "22px", 
                textShadow: "2px 2px 5px black", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", maxWidth: "45%"
              }}>
                {cat}
              </div>
            );
          })}
        </div>
      </div>

      {/* FIXED: Distinct, massive winning text banner below the packed wheel */}
      {!isSpinning && selectedCategory && (
        <div style={{
          marginTop: "40px",
          padding: "15px 50px",
          background: "rgba(0,0,0,0.85)",
          border: "4px solid #2ecc71",
          borderRadius: "50px",
          color: "#fff",
          fontSize: "42px",
          fontWeight: "900",
          boxShadow: "0 0 30px rgba(46, 204, 113, 0.8), inset 0 0 15px rgba(46, 204, 113, 0.5)",
          animation: "pop-in-winner 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          textShadow: "0 4px 10px rgba(0,0,0,0.8)",
          zIndex: 20
        }}>
          {selectedCategory}
        </div>
      )}

    </div>
  );
}