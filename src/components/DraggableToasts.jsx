import React, { useState, useEffect, useRef } from "react";

export default function DraggableToasts({ toasts }) {
  // Default position: Bottom left-ish
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true); // 👈 Toggle background/borders
  
  const dragInfo = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleMouseDown = (e) => {
    if (!isEditMode) return;
    setIsDragging(true);
    dragInfo.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({ 
        x: dragInfo.current.initialX + (e.clientX - dragInfo.current.startX), 
        y: dragInfo.current.initialY + (e.clientY - dragInfo.current.startY) 
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isDragging]);

  return (
    <div style={{
      position: "fixed", top: position.y, left: position.x, zIndex: 9998,
      width: "300px", height: "350px", minWidth: "200px", minHeight: "150px",
      resize: isEditMode ? "both" : "none", // 👈 Only resizable when unlocked
      overflow: "hidden", 
      display: "flex", flexDirection: "column",
      background: isEditMode ? "rgba(0, 0, 0, 0.7)" : "transparent",
      border: isEditMode ? "2px dashed #f39c12" : "none",
      borderRadius: "12px",
      direction: "rtl",
      pointerEvents: "auto" // Ensure we can click the lock button
    }}>
      
      {/* 🛠️ Drag Handle & Lock Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px", background: isEditMode ? "rgba(0,0,0,0.5)" : "transparent" }}>
        <button 
          onClick={() => setIsEditMode(!isEditMode)} 
          title={isEditMode ? "Lock & Hide Box" : "Unlock & Move Box"}
          style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px", opacity: isEditMode ? 1 : 0.2, transition: "opacity 0.2s" }}
        >
          {isEditMode ? "🔓 إخفاء الإطار" : "🔒"}
        </button>
        
        {isEditMode && (
          <div onMouseDown={handleMouseDown} style={{ cursor: isDragging ? "grabbing" : "grab", color: "#f39c12", fontSize: "12px", flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ↕️ اسحب لتغيير المكان
          </div>
        )}
      </div>

      {/* 🍞 Toasts Render Area */}
      <div style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column-reverse", gap: "8px", overflow: "hidden", pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
      
      {/* Visual Resize Hint */}
      {isEditMode && <div style={{ position: "absolute", bottom: "4px", right: "4px", color: "#f39c12", fontSize: "14px", pointerEvents: "none" }}>↘</div>}
    </div>
  );
}