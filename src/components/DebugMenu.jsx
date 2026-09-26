// src/components/DebugMenu.jsx
import React, { useState, useEffect, useRef } from "react";
import { AudioConfig, updateAudioSettings, SOUNDS, playSound } from "../utils/Sounds"; 
import { VOICE_PERSONAS } from "../utils/VoicePersonas";
import {
  getStoredHostPin,
  setStoredHostPin,
  isTrustModeEnabled,
  setTrustModeEnabled,
  shouldHideDebugAnswers,
  setHideDebugAnswers,
  verifyHostPin,
} from "../utils/hostTrust";
import { DEFAULT_GIFT_TRIGGER_RULES } from "../utils/giftTriggerDefaults";
import GiftSearchSelect from "./GiftSearchSelect";
import KingsHallOverlay from "./KingsHallOverlay";

export default function DebugMenu({
  onTriggerGift, onSimulateViewer, onSkip, currentGoal, onUpdateGoal, onReset, triggerRules, setTriggerRules, 
  questionDuration, onUpdateQuestionDuration, resultDuration, onUpdateResultDuration,
  votingDuration, onUpdateVotingDuration, isPaused, onTogglePause, categories, onForceCategory, 
  onStartRandom, onStartVoting, onEmergencyClear,
  globalLikes, sessionLikes, sessionGifts = 0, setSessionGifts, gateActive = false, gateProgress = 0, gateRemaining = 0,
  gateTarget = 5000, setGateTarget, gateStep = null, gateKind = null,
  gateMode = "both", setGateMode, gateEvery = 3, setGateEvery,
  addManualLikes, addGiftRequest, setGlobalLikes, setSessionLikes,
  forceCompleteLikesGate, skipLikesGate,
  likesEnabled, setLikesEnabled,
  likesLabel, setLikesLabel,
  votingGateTitle, setVotingGateTitle,
  usedQuestionIds = [], setUsedQuestionIds, questionList = [], qIdx = 0, currentCategory = "",
  isTTSMuted, setIsTTSMuted, ttsPersona, setTtsPersona, players = {}, handleAddManualWinner,
  ttsSpeed, setTtsSpeed, revealDelay, setRevealDelay, evalDelay, setEvalDelay, 
  votingResultDelay, setVotingResultDelay, wheelResultDelay, setWheelResultDelay,
  allTimeWinners = [], allTimeDonators = [], handleRenameWinner, handleRenameDonator,
  handleClearAllDonators, handleDeleteDonator, handleRefreshDonatorImages,
  isLiveState = true, setIsLiveState,
  connectionStatus = {},
  socketConnected = false,
  onConnectTikTok,
  onDisconnectTikTok,
  onRequestTikTokStatus,
  feverMode = false,
  setFeverMode,
  shuffleAnswers = false,
  setShuffleAnswers,
  addTime,
}) {
  const [forceCat, setForceCat] = useState("");
  
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("اللعبة");
  const [audioState, setAudioState] = useState({ ...AudioConfig });
  const [selectedWinPlayer, setSelectedWinPlayer] = useState("");
  const [renameListType, setRenameListType] = useState("winner");
  const [renameUserId, setRenameUserId] = useState("");
  const [renameNewName, setRenameNewName] = useState("");
  const [tempGoal, setTempGoal] = useState(currentGoal || 2000);
  const [trustMode, setTrustMode] = useState(() => isTrustModeEnabled());
  const [hideAnswers, setHideAnswers] = useState(() => shouldHideDebugAnswers());
  const [pinDraft, setPinDraft] = useState(() => getStoredHostPin());
  const [pinUnlock, setPinUnlock] = useState("");
  const [panelUnlocked, setPanelUnlocked] = useState(() => !getStoredHostPin() || !isTrustModeEnabled());
  const [showKingsHall, setShowKingsHall] = useState(false);

  useEffect(() => {
    setTempGoal(currentGoal || 2000);
  }, [currentGoal]);
  const [tempQDur, setTempQDur] = useState(questionDuration || 15);
  const [tempRDur, setTempRDur] = useState(resultDuration || 5);
  const [tempVoteDur, setTempVoteDur] = useState(votingDuration || 30);
  const [tempReveal, setTempReveal] = useState(revealDelay || 2000);
  const [tempEval, setTempEval] = useState(evalDelay || 5500);
  const [tempVoteRes, setTempVoteRes] = useState(votingResultDelay || 5000);
  const [tempWheelRes, setTempWheelRes] = useState(wheelResultDelay || 1500); 
  const [tikTokUsername, setTikTokUsername] = useState(connectionStatus.username || "");
  const [connMode, setConnMode] = useState(connectionStatus.mode || "auto");
  const [tikfinityHost, setTikfinityHost] = useState(connectionStatus.tikfinityHost || "127.0.0.1");
  const [tikfinityPort, setTikfinityPort] = useState(connectionStatus.tikfinityPort || 21213);

  useEffect(() => {
    if (connectionStatus.username) setTikTokUsername(connectionStatus.username);
    if (connectionStatus.mode) setConnMode(connectionStatus.mode);
    if (connectionStatus.tikfinityHost) setTikfinityHost(connectionStatus.tikfinityHost);
    if (connectionStatus.tikfinityPort) setTikfinityPort(connectionStatus.tikfinityPort);
  }, [connectionStatus.username, connectionStatus.mode, connectionStatus.tikfinityHost, connectionStatus.tikfinityPort]);

  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startX: 0, startY: 0, initialX: position.x, initialY: position.y });

  const totalQs = questionList?.length || 0;
  const activeQ = questionList[qIdx % (totalQs || 1)] || null;

  const handleMouseDown = (e) => { 
    setIsDragging(true);
    dragInfo.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y }; 
  };

  useEffect(() => {
    const handleMouseMove = (e) => { 
      if (isDragging) setPosition({ x: dragInfo.current.initialX + (e.clientX - dragInfo.current.startX), y: dragInfo.current.initialY + (e.clientY - dragInfo.current.startY) }); 
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener("mousemove", handleMouseMove); window.addEventListener("mouseup", handleMouseUp); }
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isDragging]);

  const handleAudioChange = (key, value) => {
    const newState = { ...audioState, [key]: value };
    setAudioState(newState); 
    updateAudioSettings(newState);
  };

  const handleIndividualVolumeChange = (soundKey, value) => {
    const updatedIndividual = { ...audioState.individualVolumes, [soundKey]: value };
    const newState = { ...audioState, individualVolumes: updatedIndividual };
    setAudioState(newState); 
    updateAudioSettings(newState); 
  };

  const handleExportBackup = () => {
    const data = {
      winners: localStorage.getItem("trivia_all_time_winners") || "[]",
      donators: localStorage.getItem("trivia_all_time_donators") || "[]",
      settings: localStorage.getItem("trivia_audio_settings") || "{}",
      triggers: localStorage.getItem("trivia_triggers") || "[]",
      usedQs: localStorage.getItem("trivia_used_questions") || "[]",
      customBank: localStorage.getItem("trivia_custom_bank") || "[]",
      liveSession: localStorage.getItem("trivia_live_session") || "",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `full_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if(data.winners) localStorage.setItem("trivia_all_time_winners", data.winners);
        if(data.donators) localStorage.setItem("trivia_all_time_donators", data.donators);
        if(data.settings) localStorage.setItem("trivia_audio_settings", data.settings);
        if(data.triggers) localStorage.setItem("trivia_triggers", data.triggers);
        if(data.usedQs) localStorage.setItem("trivia_used_questions", data.usedQs);
        if(data.customBank) localStorage.setItem("trivia_custom_bank", data.customBank);
        if(data.liveSession) localStorage.setItem("trivia_live_session", data.liveSession);
        else localStorage.removeItem("trivia_live_session");
        localStorage.removeItem("trivia_saved_alerts");
        localStorage.removeItem("trivia_custom_tickers");
        localStorage.removeItem("trivia_show_defaults");
        localStorage.removeItem("trivia_show_autoads");
        localStorage.removeItem("trivia_ticker_speed");
        localStorage.removeItem("trivia_gift_vertical_offset");
        alert("✅ تم استيراد النسخة الاحتياطية! سيتم تحديث الصفحة."); 
        window.location.reload();
      } catch { alert("❌ صيغة غير صحيحة."); }
    };
    reader.readAsText(file);
  };

  const updateRule = (id, field, value) => { 
    if(setTriggerRules) setTriggerRules(prev => (prev || []).map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const deleteRule = (id) => { 
    if(setTriggerRules) setTriggerRules(prev => (prev || []).filter(r => r.id !== id));
  };
  
  const addRule = () => { 
    if(setTriggerRules) setTriggerRules(prev => [
      ...(prev || []), 
      { id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, giftId: "rose", action: "add_time", value: 10 }
    ]);
  };

  const POWER_OPTIONS = [
    { value: "add_time", label: "إضافة وقت (+ثانية)" },
    { value: "remove_wrong", label: "حذف إجابة خاطئة" },
    { value: "fever_mode", label: "وضع الحماس (x2)" },
    { value: "fifty_fifty", label: "50/50 (إخفاء 2)" },
    { value: "reroll", label: "تغيير/تخطي السؤال" },
    { value: "override_vote", label: "👑 فيتو — إنهاء التصويت" },
    { value: "sabotage_blur", label: "🌫️ طمس الشاشة" },
    { value: "point_steal", label: "🥷 سرقة نقاط من المتصدر" },
    { value: "play_airhorn", label: "📢 بوق / إزعاج" },
    { value: "vip_sponsor", label: "👑 لافتة راعي VIP" },
    { value: "donor_pick", label: "👑 اختيار الداعم فقط (دكتاتور)" },
    { value: "spin_wheel", label: "🎲 تدوير عشوائي" },
    { value: "double_scores", label: "🤑 مضاعفة نقاط الجميع" },
    { value: "add_points", label: "💰 إضافة نقاط للمرسل" },
    ...(categories || []).map(c => ({ value: `cat_${c}`, label: `📁 ${c}` }))
  ];

  const fireRuleByAction = (action) => {
    const rule = (triggerRules || []).find((r) => r.action === action);
    if (rule && onTriggerGift) {
      onTriggerGift(rule.id, { id: "debug", name: "Tester", avatar: "" }, 20);
      return;
    }
    // Fallback manual IDs still handled in useTikTokGifts
    const manual = {
      fifty_fifty: "manual_fifty",
      reroll: "manual_reroll",
      fever_mode: "manual_fever",
      double_scores: "manual_double",
    }[action];
    if (manual && onTriggerGift) onTriggerGift(manual, { id: "debug", name: "Tester", avatar: "" }, 0);
    else alert(`لا يوجد محفز مفعّل لـ: ${action}`);
  };

  const QUICK_POWERS = [
    { action: "add_time", label: "⏳ وقت+" },
    { action: "remove_wrong", label: "🗑️ حذف ١" },
    { action: "fifty_fifty", label: "50/50" },
    { action: "fever_mode", label: "🔥 حماس" },
    { action: "reroll", label: "🔄 تغيير" },
    { action: "vip_sponsor", label: "👑 VIP" },
    { action: "sabotage_blur", label: "🌫️ طمس" },
    { action: "point_steal", label: "🥷 سرقة" },
    { action: "play_airhorn", label: "📢 بوق" },
    { action: "override_vote", label: "🗳️ فيتو" },
    { action: "donor_pick", label: "👑 دكتاتور" },
    { action: "double_scores", label: "🤑 x2 نقاط" },
  ];

  const kingsHallPortal = (
    <KingsHallOverlay open={showKingsHall} winners={allTimeWinners} onClose={() => setShowKingsHall(false)} />
  );

  if (!isOpen) {
    return (
      <>
      {kingsHallPortal}
      <button
        onClick={() => {
          setIsOpen(true);
          if (trustMode && getStoredHostPin()) setPanelUnlocked(false);
        }}
        style={{ position: "fixed", top: position.y, left: position.x, zIndex: 9999, background: "#1a1a1b", border: "2px solid #333", color: "#ffd700", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "900", fontSize: "12px" }}
      >
        🛠️ فتح لوحة التحكم
      </button>
      </>
    );
  }

  if (!panelUnlocked) {
    return (
      <>
      {kingsHallPortal}
      <div style={{ position: "fixed", top: position.y, left: position.x, zIndex: 9999, width: "300px", background: "#181a1b", border: "1px solid #e74c3c", borderRadius: "12px", padding: "16px", direction: "rtl", boxShadow: "0 15px 40px rgba(0,0,0,0.9)" }}>
        <h3 style={{ margin: "0 0 10px", color: "#e74c3c", fontSize: "14px" }}>🔒 وضع الجوائز — أدخل PIN</h3>
        <input
          type="password"
          value={pinUnlock}
          onChange={(e) => setPinUnlock(e.target.value)}
          placeholder="رمز المضيف"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px", marginBottom: "8px", background: "#111", color: "#fff", border: "1px solid #555", borderRadius: "6px" }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => {
              if (verifyHostPin(pinUnlock)) {
                setPanelUnlocked(true);
                setPinUnlock("");
              } else {
                alert("PIN غير صحيح");
              }
            }}
            style={{ flex: 1, background: "#27ae60", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "bold" }}
          >
            فتح
          </button>
          <button type="button" onClick={() => setIsOpen(false)} style={{ background: "#7f8c8d", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px" }}>إخفاء</button>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {kingsHallPortal}
    <div style={{ position: "fixed", top: position.y, left: position.x, zIndex: 9999, width: "380px", height: "540px", minWidth: "300px", minHeight: "250px", resize: "both", overflow: "hidden", background: "#181a1b", border: "1px solid #333", borderRadius: "12px", boxShadow: "0 15px 40px rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", direction: "rtl" }}>
      <div onMouseDown={handleMouseDown} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #333", cursor: isDragging ? "grabbing" : "grab", background: "#111" }}>
        <h3 style={{ margin: 0, color: "#ffd700", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>🛠️ لوحة التحكم {trustMode ? "🔒" : ""}</h3>
        <button onClick={() => { setIsOpen(false); if (trustMode && getStoredHostPin()) setPanelUnlocked(false); }} style={{ background: "transparent", border: "none", color: "#e74c3c", fontSize: "14px", cursor: "pointer" }}>❌</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", padding: "4px", background: "#1a1a1a" }}>
        {["اللعبة", "الاتصال", "الإعجابات", "المحفزات", "المؤقتات", "الصوت", "الإحصائيات", "الأمان"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: "1 0 22%", padding: "6px 0", borderRadius: "4px", border: "none", fontSize: "10px", background: activeTab === tab ? "#2980b9" : "#2c3e50", color: "#fff", cursor: "pointer" }}>{tab}</button>
        ))}
      </div>

      <div style={{ padding: "12px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {activeTab === "اللعبة" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={() => setIsLiveState?.(!isLiveState)} style={{ width: "100%", padding: "10px", background: isLiveState ? "#27ae60" : "#7f8c8d", color: "#fff", borderRadius: "8px", fontWeight: "900", cursor: "pointer" }}>{isLiveState ? "🟢 النظام متصل (LIVE)" : "⚫ النظام غير متصل"}</button>
            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", display: "flex", gap: "6px" }}>
              <button onClick={onTogglePause} style={{ flex: 1, padding: "8px", background: isPaused ? "#27ae60" : "#2980b9", color: "#fff", border: "none", borderRadius: "6px" }}>{isPaused ? "▶ استئناف" : "⏸ إيقاف مؤقت"}</button>
            </div>
  
            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", display: "flex", gap: "6px" }}>
               <button onClick={() => onStartRandom?.()} style={{ flex: 1, background: "#8e44ad", color: "#fff", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>🎲 تدوير العجلة</button>
               <button onClick={() => onStartVoting?.()} style={{ flex: 1, background: "#f39c12", color: "#fff", padding: "8px", borderRadius: "4px", fontSize: "11px" }}>🗳️ تصويت</button>
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #9b59b6" }}>
              <label style={{ color: "#9b59b6", fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "6px" }}>📁 فرض فئة فوراً</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  value={forceCat}
                  onChange={(e) => setForceCat(e.target.value)}
                  style={{ flex: 1, background: "#111", color: "#fff", border: "1px solid #555", padding: "6px", fontSize: "11px" }}
                >
                  <option value="">اختر فئة...</option>
                  <option value="mixed">مزيج (mixed)</option>
                  {(categories || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { if (forceCat) onForceCategory?.(forceCat); }}
                  style={{ background: "#8e44ad", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" }}
                >
                  تشغيل
                </button>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => onSimulateViewer?.({ id: `sim_${Date.now()}`, name: `Bot_${Math.floor(Math.random()*100)}`, avatar: "" })} style={{ flex: 1, background: "#3498db", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>💬 محاكاة مشاهد</button>
                <button onClick={() => onSkip?.()} style={{ flex: 1, background: "#e67e22", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>⏭ تخطي الوقت</button>
                <button onClick={() => onReset?.()} style={{ flex: 1, background: "#c0392b", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>🔄 إعادة ضبط</button>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setFeverMode?.(!feverMode)}
                style={{ flex: 1, background: feverMode ? "#e67e22" : "#2c3e50", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", border: "none" }}
              >
                {feverMode ? "🔥 إيقاف الحماس" : "🔥 تفعيل الحماس"}
              </button>
              <button
                type="button"
                onClick={() => onEmergencyClear?.()}
                style={{ flex: 1, background: "#922b21", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", border: "none" }}
              >
                🧹 مسح طوارئ (FX)
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setShuffleAnswers?.(!shuffleAnswers)}
                style={{ flex: 1, background: shuffleAnswers ? "#8e44ad" : "#2c3e50", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", border: "none" }}
              >
                🔀 {shuffleAnswers ? "إيقاف خلط الإجابات" : "خلط الإجابات"}
              </button>
              <button
                type="button"
                onClick={() => addTime?.(10)}
                style={{ flex: 1, background: "#27ae60", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", border: "none" }}
              >
                ⏱ +10 ثوانٍ
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowKingsHall(true)}
              style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #5c4a00, #c9a227)", color: "#fff", border: "2px solid #ffd700", borderRadius: "8px", fontWeight: "900", fontSize: "13px", cursor: "pointer", boxShadow: "0 0 18px rgba(255,215,0,0.35)" }}
            >
              👑 قاعة الملوك — عرض الترتيب
            </button>


            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #f39c12" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label htmlFor="milestone-goal" style={{ color: "#f39c12", fontSize: "11px", fontWeight: "bold" }}>🎯 معلم النقاط (مثلاً 2000 / 4000):</label>
                <span style={{ color: "#aaa", fontSize: "10px" }}>احتفال عند الوصول — الجولة تكمل 15 سؤال</span>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <input
                  id="milestone-goal"
                  name="milestoneGoal"
                  type="number"
                  min="100"
                  step="100"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(Number(e.target.value))}
                  style={{ flex: 1, background: "#111", color: "#fff", border: "1px solid #555", padding: "6px", fontSize: "12px", borderRadius: "4px" }}
                />
                <button
                  onClick={() => onUpdateGoal?.(Math.max(100, Number(tempGoal) || 2000))}
                  style={{ background: "#f39c12", color: "#000", padding: "4px 10px", borderRadius: "4px", fontWeight: "bold", border: "none", cursor: "pointer" }}
                >
                  تطبيق
                </button>
              </div>
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #444" }}>
              <label style={{ color: "#fff", fontSize: "11px", fontWeight: "bold" }}>🏆 مكافأة فوز يدوية:</label>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <select value={selectedWinPlayer} onChange={(e) => setSelectedWinPlayer(e.target.value)} style={{ flex: 1, background: "#111", color: "#fff", fontSize: "11px", padding: "4px" }}>
                  <option value="">اختر لاعباً نشطاً...</option>
                  {Object.values(players || {}).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <button onClick={() => { if(selectedWinPlayer) handleAddManualWinner?.(selectedWinPlayer); }} style={{ background: "#f1c40f", color: "#000", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>منح</button>
              </div>
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #444" }}>
                <label style={{ color: "#fff", fontSize: "11px", fontWeight: "bold" }}>✏️ تغيير اسم مستخدم القائمة:</label>
                <div style={{ display: "flex", gap: "6px", marginBottom: "4px", marginTop: "4px" }}>
                  <select value={renameListType} onChange={(e) => { setRenameListType(e.target.value); setRenameUserId(""); }} style={{ flex: 1, background: "#111", color: "#fff", fontSize: "11px" }}>
                    <option value="winner">🏆 الفائزون</option>
                    <option value="donator">💎 الداعمون</option>
                  </select>
                  <select value={renameUserId} onChange={(e) => {
                      setRenameUserId(e.target.value);
                      const list = e.target.value ? (renameListType === "winner" ? allTimeWinners : allTimeDonators) : [];
                      const user = list.find(u => u.id === e.target.value);
                      if (user) setRenameNewName(user.name);
                  }} style={{ flex: 2, background: "#111", color: "#fff", fontSize: "11px" }}>
                    <option value="">اختر المستخدم...</option>
                    {(renameListType === "winner" ? allTimeWinners : allTimeDonators).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input type="text" value={renameNewName} onChange={e => setRenameNewName(e.target.value)} placeholder="الاسم الجديد..." style={{ flex: 1, background: "#111", color: "#fff", fontSize: "12px", border: "1px solid #555" }} />
                  <button onClick={() => { if(renameUserId && renameNewName) { renameListType === "winner" ? handleRenameWinner?.(renameUserId, renameNewName) : handleRenameDonator?.(renameUserId, renameNewName); setRenameUserId(""); setRenameNewName(""); } }} style={{ background: "#3498db", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "11px" }}>تغيير</button>
                </div>
            </div>
          </div>
        )}

        {activeTab === "الاتصال" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(() => {
              const stateColor = {
                live: "#27ae60",
                connecting: "#f39c12",
                offline: "#e67e22",
                error: "#e74c3c",
                idle: "#7f8c8d",
              }[connectionStatus.tiktokState] || "#7f8c8d";
              const sourceLabel = {
                bridge: "Bridge (مباشر)",
                tikfinity: "TikFinity (احتياطي)",
                none: "لا يوجد",
              }[connectionStatus.source] || "لا يوجد";
              return (
                <>
                  <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: `1px solid ${stateColor}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                      <div>
                        <div style={{ color: "#888" }}>جسر اللعبة</div>
                        <div style={{ color: socketConnected ? "#27ae60" : "#e74c3c", fontWeight: "900" }}>
                          {socketConnected ? `🟢 متصل (${(import.meta.env?.VITE_BRIDGE_URL || "localhost:4480").replace(/^https?:\/\//, "")})` : "🔴 غير متصل"}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#888" }}>حالة التيك توك</div>
                        <div style={{ color: stateColor, fontWeight: "900" }}>{connectionStatus.tiktokState || "idle"}</div>
                      </div>
                      <div>
                        <div style={{ color: "#888" }}>المصدر النشط</div>
                        <div style={{ color: "#ffd700", fontWeight: "900" }}>{sourceLabel}</div>
                      </div>
                      <div>
                        <div style={{ color: "#888" }}>Room ID</div>
                        <div style={{ color: "#fff", fontWeight: "bold" }}>{connectionStatus.roomId || "—"}</div>
                      </div>
                    </div>
                    {connectionStatus.lastError && (
                      <div style={{ marginTop: "8px", color: "#e74c3c", fontSize: "10px", wordBreak: "break-word" }}>
                        ⚠ {connectionStatus.lastError}
                      </div>
                    )}
                  </div>

                  <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
                    <label style={{ color: "#ffd700", fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
                      اسم مستخدم تيك توك (بدون @)
                    </label>
                    <input
                      type="text"
                      value={tikTokUsername}
                      onChange={(e) => setTikTokUsername(e.target.value.replace(/^@+/, ""))}
                      placeholder="مثال: ahmadtiktokspace"
                      style={{ width: "100%", boxSizing: "border-box", background: "#111", color: "#fff", border: "1px solid #555", padding: "8px", borderRadius: "6px", fontSize: "12px", marginBottom: "8px" }}
                    />

                    <label style={{ color: "#fff", fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>وضع الاتصال</label>
                    <select
                      value={connMode}
                      onChange={(e) => setConnMode(e.target.value)}
                      style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #555", padding: "6px", borderRadius: "6px", fontSize: "11px", marginBottom: "8px" }}
                    >
                      <option value="auto">تلقائي (Bridge ثم TikFinity)</option>
                      <option value="bridge">Bridge فقط</option>
                      <option value="tikfinity">TikFinity فقط</option>
                    </select>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "6px", marginBottom: "8px" }}>
                      <div>
                        <label style={{ color: "#aaa", fontSize: "10px" }}>TikFinity Host</label>
                        <input type="text" value={tikfinityHost} onChange={(e) => setTikfinityHost(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#111", color: "#fff", border: "1px solid #555", padding: "6px", borderRadius: "4px", fontSize: "11px" }} />
                      </div>
                      <div>
                        <label style={{ color: "#aaa", fontSize: "10px" }}>Port</label>
                        <input type="number" value={tikfinityPort} onChange={(e) => setTikfinityPort(Number(e.target.value) || 21213)} style={{ width: "100%", boxSizing: "border-box", background: "#111", color: "#fff", border: "1px solid #555", padding: "6px", borderRadius: "4px", fontSize: "11px" }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => onConnectTikTok?.({
                          username: tikTokUsername,
                          mode: connMode,
                          tikfinityHost,
                          tikfinityPort,
                        })}
                        style={{ flex: 2, background: "#27ae60", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "900", cursor: "pointer", fontSize: "12px" }}
                      >
                        🔌 اتصال / تحديث
                      </button>
                      <button
                        onClick={() => onDisconnectTikTok?.()}
                        style={{ flex: 1, background: "#c0392b", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "11px" }}
                      >
                        قطع
                      </button>
                      <button
                        onClick={() => onRequestTikTokStatus?.()}
                        style={{ flex: 1, background: "#2980b9", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "11px" }}
                      >
                        تحديث
                      </button>
                    </div>
                  </div>

                  <div style={{ background: "#1a1a1a", padding: "10px", borderRadius: "8px", border: "1px solid #444", color: "#bbb", fontSize: "10px", lineHeight: 1.5 }}>
                    <div style={{ color: "#ffd700", fontWeight: "bold", marginBottom: "4px" }}>TikFinity fallback</div>
                    شغّل تطبيق TikFinity Desktop واتصل ببثك المباشر. الـ Events API الافتراضي:
                    <br />
                    <code style={{ color: "#2ecc71" }}>ws://127.0.0.1:21213/</code>
                    <br />
                    إذا فشل الجسر المحلي، يتم التحويل تلقائياً (وضع Auto).
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "الإعجابات" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: likesEnabled ? 1 : 0.5, transition: "opacity 0.3s" }}>
            
            <button 
              onClick={() => setLikesEnabled?.(!likesEnabled)} 
              style={{ width: "100%", padding: "10px", background: likesEnabled ? "#27ae60" : "#c0392b", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "900", cursor: "pointer", fontSize: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}
            >
              {likesEnabled ? "🟢 نظام الإعجابات يعمل" : "🔴 نظام الإعجابات متوقف"}
            </button>

            <div style={{ background: "#222", padding: "12px", borderRadius: "8px", textAlign: "center", border: "1px solid #e74c3c", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <div style={{ fontSize: "11px", color: "#ccc" }}>إجمالي إعجابات الجلسة</div>
              <div style={{ fontSize: "28px", color: "#ff7675", fontWeight: "900", margin: "4px 0" }}>
                {sessionLikes ?? globalLikes ?? 0}
              </div>
              <div style={{ fontSize: "11px", color: "#ccc", marginTop: "4px" }}>هدايا قيد الطلب / الجلسة: <span style={{ color: "#ffd700", fontWeight: 900 }}>{sessionGifts ?? 0}</span></div>
              <div style={{ display: "flex", gap: "5px", justifyContent: "center", marginTop: "6px" }}>
                <button
                  onClick={() => {
                    setSessionLikes?.(0);
                    setGlobalLikes?.(0);
                    setSessionGifts?.(0);
                  }}
                  style={{ background: "transparent", border: "1px solid #e74c3c", color: "#e74c3c", padding: "4px 10px", fontSize: "11px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                >
                  تصفير
                </button>
                <button
                  onClick={() => addManualLikes?.(1000)}
                  style={{ background: "#ff7675", border: "none", color: "#fff", padding: "4px 10px", fontSize: "11px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                >
                  +1000
                </button>
              </div>
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <label htmlFor="gate-mode" style={{ fontSize: "12px", display: "block", color: "#f1c40f", marginBottom: "5px" }}>نوع البوابة بين الأسئلة</label>
              <select id="gate-mode" value={gateMode || "both"} onChange={(e) => setGateMode?.(e.target.value)} style={{ width: "100%", background: "#111", border: "1px solid #555", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "12px" }}>
                <option value="likes">إعجابات فقط</option>
                <option value="gifts">هدية/طلب هدية فقط</option>
                <option value="both">إعجابات + هدايا</option>
              </select>
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <label htmlFor="gate-every" style={{ fontSize: "12px", display: "block", color: "#f1c40f", marginBottom: "5px" }}>بوابة كل عدد أسئلة</label>
              <input id="gate-every" type="number" min="1" max="50" value={gateEvery || 3} onChange={(e) => setGateEvery?.(Math.max(1, Number(e.target.value) || 1))} style={{ width: "100%", background: "#111", border: "1px solid #555", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }} />
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => addGiftRequest?.(1)} style={{ flex: 1, background: "#ffd700", color: "#111", padding: "8px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>+1 طلب هدية</button>
                <button onClick={() => addGiftRequest?.(10)} style={{ flex: 1, background: "#f39c12", color: "#fff", padding: "8px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>+10 هدايا</button>
              </div>
            </div>

            <div style={{ background: "#222", padding: "12px", borderRadius: "8px", border: gateActive ? "1px solid #f1c40f" : "1px solid #333", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <div style={{ fontSize: "12px", color: gateActive ? "#f1c40f" : "#888", fontWeight: "900", marginBottom: "8px" }}>
                {gateActive
                  ? gateKind === "voting"
                    ? "🏁 بوابة ما بعد الجولة (قبل التصويت)"
                    : `🚧 البوابة مفتوحة${gateStep ? ` — بعد السؤال ${gateStep}` : ""}`
                  : "🚧 لا توجد بوابة نشطة"}
              </div>
              {gateActive && (
                <>
                  <div style={{ fontSize: "13px", color: "#fff", marginBottom: "6px" }}>
                    التقدم: <strong style={{ color: "#ff7675" }}>{gateProgress}</strong>
                    {" / "}
                    {gateTarget}
                    <span style={{ color: "#aaa", marginRight: "8px" }}> (باقي {gateRemaining})</span>
                  </div>
                  <div style={{ height: "8px", background: "#111", borderRadius: "4px", overflow: "hidden", marginBottom: "10px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (gateProgress / Math.max(1, gateTarget)) * 100)}%`,
                        background: "linear-gradient(90deg, #e74c3c, #ff9ff3)",
                      }}
                    />
                  </div>
                </>
              )}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => {
                    if (gateActive && gateRemaining > 0) addManualLikes?.(gateRemaining);
                    else forceCompleteLikesGate?.();
                  }}
                  disabled={!gateActive}
                  style={{
                    flex: 1,
                    background: gateActive ? "#ff7675" : "#444",
                    border: "none",
                    color: "#fff",
                    padding: "8px",
                    fontSize: "11px",
                    borderRadius: "4px",
                    cursor: gateActive ? "pointer" : "not-allowed",
                    fontWeight: "bold",
                    opacity: gateActive ? 1 : 0.5,
                  }}
                >
                  تعبئة / إكمال البوابة
                </button>
                <button
                  onClick={() => skipLikesGate?.()}
                  disabled={!gateActive}
                  style={{
                    flex: 1,
                    background: gateActive ? "#e67e22" : "#444",
                    border: "none",
                    color: "#fff",
                    padding: "8px",
                    fontSize: "11px",
                    borderRadius: "4px",
                    cursor: gateActive ? "pointer" : "not-allowed",
                    fontWeight: "bold",
                    opacity: gateActive ? 1 : 0.5,
                  }}
                >
                  تخطي البوابة
                </button>
              </div>
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <label htmlFor="like-label" style={{ fontSize: "12px", display: "block", color: "#f1c40f", marginBottom: "5px" }}>🏷️ تسمية العداد (أثناء الأسئلة):</label>
              <input id="like-label" name="likeLabel" type="text" value={likesLabel} onChange={(e) => setLikesLabel?.(e.target.value)} style={{ width: "100%", background: "#111", border: "1px solid #555", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }} />
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <label htmlFor="voting-gate-title" style={{ fontSize: "12px", display: "block", color: "#f1c40f", marginBottom: "5px" }}>🏁 عنوان بوابة ما بعد الجولة (قبل التصويت):</label>
              <input
                id="voting-gate-title"
                name="votingGateTitle"
                type="text"
                value={votingGateTitle || ""}
                onChange={(e) => setVotingGateTitle?.(e.target.value)}
                style={{ width: "100%", background: "#111", border: "1px solid #555", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                <label htmlFor="like-gate-target" style={{ fontSize: "12px", color: "#f1c40f" }}>🎯 هدف البوابة (+):</label>
                <input
                  id="like-gate-target"
                  type="number"
                  value={gateTarget}
                  onChange={(e) => setGateTarget?.(Number(e.target.value))}
                  style={{ width: "70px", background: "#111", border: "1px solid #555", color: "#fff", padding: "4px", borderRadius: "4px", fontSize: "11px" }}
                />
              </div>
              <input
                name="gateTarget"
                type="range"
                min="1000"
                max="20000"
                step="500"
                value={gateTarget}
                onChange={(e) => setGateTarget?.(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#ff7675" }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", pointerEvents: likesEnabled ? "auto" : "none" }}>
              <button onClick={() => addManualLikes?.(10)} style={{ flex: 1, background: "#e84393", color: "white", padding: "8px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>+10 ❤️</button>
              <button onClick={() => addManualLikes?.(100)} style={{ flex: 1, background: "#d63031", color: "white", padding: "8px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>+100 ❤️</button>
              <button onClick={() => addManualLikes?.(1000)} style={{ flex: 1, background: "#c0392b", color: "white", padding: "8px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>+1K ❤️</button>
            </div>
          </div>
        )}

        {activeTab === "المحفزات" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

            <div style={{ background: "#1a2733", padding: "10px", borderRadius: "8px", border: "1px solid #f1c40f", marginBottom: "4px" }}>
              <div style={{ color: "#f1c40f", fontSize: "12px", fontWeight: "900", marginBottom: "8px" }}>🧪 اختبار سريع — كل القدرات على الشاشة</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px" }}>
                {QUICK_POWERS.map((p) => (
                  <button
                    key={p.action}
                    type="button"
                    onClick={() => fireRuleByAction(p.action)}
                    style={{ background: "#2c3e50", color: "#fff", border: "1px solid #555", padding: "7px 4px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", cursor: "pointer" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p style={{ margin: "8px 0 0", color: "#95a5a6", fontSize: "9px", lineHeight: 1.35 }}>
                يشغّل نفس منطق الهدايا (Tester). جرّب 50/50 أو حذف أثناء السؤال لترى الإجابة المستبعدة بالأحمر.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
              <span style={{color: "#fff", fontSize: "12px", fontWeight: "bold"}}>⚡ محفزات الطاقة (Triggers)</span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("استعادة المحفزات الافتراضية؟")) {
                      setTriggerRules?.(DEFAULT_GIFT_TRIGGER_RULES.map((r) => ({ ...r })));
                    }
                  }}
                  style={{ background: "#2980b9", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px" }}
                >
                  ↺ افتراضي
                </button>
                <button onClick={() => { if(window.confirm("حذف الكل؟")) setTriggerRules?.([]); }} style={{ background: "#c0392b", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px" }}>🗑️ مسح الكل</button>
              </div>
            </div>
            {(triggerRules || []).filter(r => r.type !== "user_event" && r.action !== "play_alert" && r.action !== "add_heart").map((rule) => (
              <div key={rule.id} style={{ display: "flex", gap: "4px", background: "#222", padding: "6px", borderRadius: "6px", border: "1px solid #444", alignItems: "center" }}>
                <GiftSearchSelect value={rule.giftId || "rose"} onChange={val => updateRule(rule.id, "giftId", val)} />
                <select value={rule.action} onChange={e => updateRule(rule.id, "action", e.target.value)} style={{ flex: 1, background: "#111", color: "#fff", border: "1px solid #555", padding: "4px", fontSize: "10px" }}>
                  {POWER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <input type="number" value={rule.value} onChange={e => updateRule(rule.id, "value", Number(e.target.value))} style={{ width: "35px", background: "#111", color: "#fff", border: "1px solid #555", padding: "4px", textAlign: "center", fontSize: "10px" }} />
                <div style={{ display: "flex", gap: "2px", width: "48px" }}>
                  <button 
                    onClick={() => onTriggerGift && onTriggerGift(rule.id, {id:"debug", name:"Tester", avatar:""})} 
                    style={{ flex: 1, background: "#8e44ad", color: "#fff", border: "none", padding: "4px", borderRadius: "4px", cursor: "pointer", fontSize: "9px" }}
                  >
                    ▶
                  </button>
                  <button 
                    onClick={() => deleteRule(rule.id)} 
                    style={{ flex: 1, background: "#c0392b", color: "#fff", border: "none", padding: "4px", borderRadius: "4px", cursor: "pointer", fontSize: "9px" }}
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addRule} style={{ width: "100%", padding: "8px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", marginTop: "4px" }}>➕ إضافة محفز جديد</button>
          </div>
        )}

        {activeTab === "المؤقتات" && (
           <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                   <div><label style={{ color: "#fff", fontSize: "10px" }}>السؤال (ث):</label><input type="number" value={tempQDur} onChange={(e) => setTempQDur(Number(e.target.value))} style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #444" }} /></div>
                   <div><label style={{ color: "#fff", fontSize: "10px" }}>النتيجة (ث):</label><input type="number" value={tempRDur} onChange={(e) => setTempRDur(Number(e.target.value))} style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #444" }} /></div>
                   <div><label style={{ color: "#fff", fontSize: "10px" }}>التصويت (ث):</label><input type="number" value={tempVoteDur} onChange={(e) => setTempVoteDur(Number(e.target.value))} style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #444" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                   <div><label style={{ color: "#fff", fontSize: "10px" }}>الكشف (مل ث):</label><input type="number" value={tempReveal} onChange={(e) => setTempReveal(Number(e.target.value))} style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #444" }} /></div>
                   <div><label style={{ color: "#fff", fontSize: "10px" }}>التقييم (مل ث):</label><input type="number" value={tempEval} onChange={(e) => setTempEval(Number(e.target.value))} style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #444" }} /></div>
                   <div><label style={{ color: "#fff", fontSize: "10px" }}>نتيجة التصويت (مل ث):</label><input type="number" value={tempVoteRes} onChange={(e) => setTempVoteRes(Number(e.target.value))} style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #444" }} /></div>
                   <div><label style={{ color: "#fff", fontSize: "10px" }}>نتيجة العجلة (مل ث):</label><input type="number" value={tempWheelRes} onChange={(e) => setTempWheelRes(Number(e.target.value))} style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #444" }} /></div>
                </div>
                <button onClick={() => { 
                  onUpdateQuestionDuration?.(Math.max(5, tempQDur));
                  onUpdateResultDuration?.(Math.max(2, tempRDur)); 
                  onUpdateVotingDuration?.(Math.max(5, tempVoteDur));
                  setRevealDelay?.(tempReveal); setEvalDelay?.(tempEval); setVotingResultDelay?.(tempVoteRes); setWheelResultDelay?.(tempWheelRes);
                  alert("✅ تم تطبيق جميع المؤقتات!");
                }} style={{ width: "100%", background: "#27ae60", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", marginTop: "12px", fontWeight: "bold" }}>تطبيق جميع المؤقتات</button>
              </div>
           </div>
        )}

        {activeTab === "الصوت" && (
           <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "13px" }}>🎵 مستوى موسيقى الخلفية</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <input type="range" min="0" max="1" step="0.05" value={audioState.musicVolume} onChange={(e) => handleAudioChange("musicVolume", parseFloat(e.target.value))} style={{ flex: 1, transform: "scaleX(-1)" }} />
                  <span style={{ color: "#fff", width: "30px", fontSize: "12px" }}>{Math.round(audioState.musicVolume * 100)}%</span>
                </div>
                <button onClick={() => handleAudioChange("musicMuted", !audioState.musicMuted)} style={{ width: "100%", padding: "6px", background: audioState.musicMuted ? "#c0392b" : "#27ae60", color: "#fff", borderRadius: "4px" }}>{audioState.musicMuted ? "🔇 الموسيقى مكتومة" : "🔊 الموسيقى مفعلة"}</button>
              </div>

              <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "13px" }}>💥 مستوى المؤثرات الصوتية</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <input 
                    id="master-sfx" 
                    name="masterSfx" 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={audioState.sfxVolume} 
                    onChange={(e) => handleAudioChange("sfxVolume", parseFloat(e.target.value))} 
                    disabled={audioState.sfxMuted} 
                    style={{ flex: 1, transform: "scaleX(-1)" }} 
                  />
                  <span style={{ color: "#fff", width: "30px", fontSize: "12px", textAlign: "right" }}>{Math.round(audioState.sfxVolume * 100)}%</span>
                </div>
                <button 
                  onClick={() => handleAudioChange("sfxMuted", !audioState.sfxMuted)} 
                  style={{ width: "100%", padding: "6px", background: audioState.sfxMuted ? "#c0392b" : "#27ae60", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                >
                  {audioState.sfxMuted ? "🔇 المؤثرات مكتومة" : "🔊 المؤثرات مفعلة"}
                </button>
              </div>

              <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #3498db" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#3498db", fontSize: "13px" }}>🤖 إعدادات صوت المعلق</h4>
                <select value={ttsPersona} onChange={(e) => setTtsPersona?.(e.target.value)} style={{ width: "100%", background: "#111", color: "white", padding: "6px" }}>
                   {VOICE_PERSONAS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                  <label style={{color: "#fff", fontSize: "11px"}}>السرعة:</label>
                  <input type="range" min="0.5" max="2.5" step="0.1" value={ttsSpeed} onChange={(e) => setTtsSpeed?.(Number(e.target.value))} style={{ flex: 1, transform: "scaleX(-1)" }} />
                  <span style={{ color: "#fff", fontSize: "11px", width: "30px" }}>{ttsSpeed}x</span>
                </div>
                <button onClick={() => setIsTTSMuted?.(!isTTSMuted)} style={{ width: "100%", padding: "6px", background: isTTSMuted ? "#c0392b" : "#27ae60", color: "#fff", marginTop: "10px", borderRadius: "4px" }}>{isTTSMuted ? "🔇 المعلق مكتوم" : "🔊 المعلق مفعل"}</button>
              </div>

              <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#aaa", fontSize: "11px" }}>🎚️ ضبط المؤثرات الصوتية بدقة</h4>
                <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.keys(audioState.individualVolumes).map(key => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <label style={{ color: "#aaa", fontSize: "10px", width: "65px", textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                       <input 
                         id={`ind-vol-${key}`} 
                         name={`indVol_${key}`}
                         type="range" 
                         min="0" 
                         max="1" 
                         step="0.05" 
                         value={audioState.individualVolumes[key]} 
                         onChange={(e) => handleIndividualVolumeChange(key, parseFloat(e.target.value))} 
                         disabled={audioState.sfxMuted} 
                         style={{ flex: 1, accentColor: "#e67e22", transform: "scaleX(-1)" }} 
                       />
                      <button onClick={() => playSound(SOUNDS[key])} style={{ background: "#2980b9", color: "#fff", border: "none", padding: "2px 6px", borderRadius: "4px", fontSize: "9px" }}>▶</button>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        )}

        {activeTab === "الإحصائيات" && (
           <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
             <div style={{ background: "#222", padding: "12px", borderRadius: "8px", border: "1px solid #f1c40f" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, color: "#f1c40f", fontSize: "13px" }}>💎 إدارة الداعمين (الشاشة اليمنى)</h4>
                  <span style={{ color: "#aaa", fontSize: "10px" }}>{(allTimeDonators || []).length} داعم</span>
                </div>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleRefreshDonatorImages?.()}
                    style={{ flex: 1, background: "#2980b9", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}
                  >
                    🔄 تحديث الصور
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (window.confirm("مسح كل الداعمين؟")) handleClearAllDonators?.(); }}
                    style={{ flex: 1, background: "#c0392b", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}
                  >
                    🗑 مسح الكل
                  </button>
                </div>
                <div style={{ maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {(allTimeDonators || []).slice(0, 12).map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#111", padding: "4px 6px", borderRadius: "4px" }}>
                      <img src={d.avatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                      <span style={{ flex: 1, color: "#fff", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      <span style={{ color: "#f1c40f", fontSize: "11px", fontWeight: "900" }}>{d.score || 0}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDonator?.(d.id)}
                        style={{ background: "transparent", color: "#e74c3c", border: "none", cursor: "pointer", fontWeight: "900" }}
                        aria-label="حذف داعم"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(allTimeDonators || []).length === 0 && (
                    <div style={{ color: "#666", fontSize: "11px", textAlign: "center", padding: "8px" }}>لا داعمين بعد — اختبر هدية من تبويب المحفزات</div>
                  )}
                </div>
             </div>
             <div style={{ background: "#222", padding: "12px", borderRadius: "8px", border: "1px solid #9b59b6" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#9b59b6", fontSize: "13px" }}>💾 المزامنة السحابية / النسخ الاحتياطي</h4>
                <div style={{ display: "flex", gap: "6px" }}>
                   <button onClick={handleExportBackup} style={{ flex: 1, background: "#8e44ad", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" }}>⬇️ تصدير الكل</button>
                   <label style={{ flex: 1, background: "#2980b9", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", textAlign: "center", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>⬆️ استيراد نسخة<input type="file" accept=".json" onChange={handleImportBackup} style={{ display: "none" }} /></label>
                </div>
             </div>
             <div style={{ background: "#222", padding: "12px", borderRadius: "8px", border: "1px solid #16a085" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <h4 style={{ margin: 0, color: "#16a085", fontSize: "13px" }}>🔄 حالة السجل</h4>
                   <button onClick={() => { if(window.confirm("مسح جميع الأسئلة السابقة؟")) setUsedQuestionIds?.([]); }} style={{ background: "#c0392b", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "9px" }}>إعادة ضبط السجل</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", marginTop: "10px" }}>
                   <div style={{ background: "#111", padding: "6px", borderRadius: "4px" }}><div style={{ color: "#888" }}>إجمالي الأسئلة</div><div style={{ color: "#fff", fontWeight: "bold" }}>{totalQs} س</div></div>
                   <div style={{ background: "#111", padding: "6px", borderRadius: "4px" }}><div style={{ color: "#888" }}>تم مشاهدتها</div><div style={{ color: "#fff", fontWeight: "bold" }}>{usedQuestionIds.length} س</div></div>
                   <div style={{ background: "#111", padding: "6px", borderRadius: "4px" }}><div style={{ color: "#888" }}>الفئة</div><div style={{ color: "#fff", fontWeight: "bold" }}>{currentCategory || "لا يوجد"}</div></div>
                   <div style={{ background: "#111", padding: "6px", borderRadius: "4px", borderRight: "3px solid #2ecc71" }}>
                     <div style={{ color: "#888" }}>✅ الإجابة الصحيحة</div>
                     <div style={{ color: hideAnswers || trustMode ? "#7f8c8d" : "#2ecc71", fontWeight: "bold", fontSize: "12px" }}>
                       {hideAnswers || trustMode ? "🔒 مخفية (وضع الجوائز)" : (activeQ?.a || "غير متوفر")}
                     </div>
                   </div>
                </div>
             </div>
             <div style={{ background: "#222", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#aaa", fontSize: "11px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>📁 تفاصيل الفئات (الكل)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "6px" }}>
                   {questionList && questionList.length > 0 ? (
                     Object.entries(questionList.reduce((acc, q) => {
                       const cat = q.category || "غير مصنف";
                       acc[cat] = (acc[cat] || 0) + 1;
                       return acc;
                     }, {})).map(([cat, count], i) => (
                       <div key={i} style={{ fontSize: "10px", color: "#fff", padding: "4px", background: "#1a1a1a", borderRight: "2px solid #3498db", display: "flex", justifyContent: "space-between" }}>
                          <span>{cat}</span>
                          <span style={{ fontWeight: "bold", color: "#f1c40f" }}>{count} س</span>
                       </div>
                     ))
                   ) : (
                   <div style={{ fontSize: "10px", color: "#555", fontStyle: "italic" }}>لا تتوفر بيانات الفئات.</div>
                   )}
                </div>
             </div>
           </div>
        )}

        {activeTab === "الأمان" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#222", padding: "12px", borderRadius: "8px", border: "1px solid #e74c3c" }}>
              <h4 style={{ margin: "0 0 8px", color: "#e74c3c", fontSize: "13px" }}>🔒 وضع الجوائز / الثقة</h4>
              <p style={{ margin: "0 0 10px", color: "#aaa", fontSize: "11px", lineHeight: 1.4 }}>
                يمنع spoof الهدايا من DevTools، يخفي الإجابة الصحيحة، ويقفل اللوحة بـ PIN قبل أي إطار جوائز نقدية.
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "12px", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={trustMode}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setTrustMode(on);
                    setTrustModeEnabled(on);
                    if (on) {
                      setHideAnswers(true);
                      setHideDebugAnswers(true);
                      if (window.__gameProbe) delete window.__gameProbe;
                    }
                  }}
                />
                تفعيل وضع الجوائز
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "12px", marginBottom: "10px" }}>
                <input
                  type="checkbox"
                  checked={hideAnswers || trustMode}
                  disabled={trustMode}
                  onChange={(e) => {
                    setHideAnswers(e.target.checked);
                    setHideDebugAnswers(e.target.checked);
                  }}
                />
                إخفاء الإجابة الصحيحة من الإحصائيات
              </label>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="password"
                  value={pinDraft}
                  onChange={(e) => setPinDraft(e.target.value)}
                  placeholder="PIN المضيف"
                  style={{ flex: 1, padding: "6px", background: "#111", color: "#fff", border: "1px solid #555", borderRadius: "4px", fontSize: "12px" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setStoredHostPin(pinDraft);
                    alert(pinDraft ? "تم حفظ PIN" : "تم مسح PIN");
                  }}
                  style={{ background: "#2980b9", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}
                >
                  حفظ PIN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: "2px", left: "2px", color: "#555", fontSize: "12px", pointerEvents: "none", transform: "scaleX(-1)" }}>↘</div>
    </div>
    </>
  );
}