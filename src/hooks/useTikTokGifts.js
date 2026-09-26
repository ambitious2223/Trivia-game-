// src/hooks/useTikTokGifts.js
import { useState, useRef, useCallback } from "react";
import { SOUNDS, playSound } from "../utils/Sounds";
import { DEFAULT_GIFT_TRIGGER_RULES, loadTriggerRulesFromStorage, saveTriggerRulesToStorage, REMOVED_GIFT_ACTIONS } from "../utils/giftTriggerDefaults";

export { DEFAULT_GIFT_TRIGGER_RULES };

export function shuffleArray(array) {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useTikTokGifts(engineRef, donatorsHook, addToast) {
  const processedMsgIds = useRef(new Set());

  const [triggerRules, setTriggerRulesState] = useState(loadTriggerRulesFromStorage);

  /** Sync-write to localStorage on every change so refresh keeps host picks. */
  const setTriggerRules = useCallback((updater) => {
    setTriggerRulesState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveTriggerRulesToStorage(next);
      return next;
    });
  }, []);

  const getRule = useCallback((actionName) => triggerRules.find(r => r.action === actionName), [triggerRules]);

  const handlePowerFiftyFifty = useCallback(() => { 
    const engine = engineRef.current;
    if (engine.phase !== "question" || !engine.q?.choices) return; 
    const wrongChoices = engine.q.choices.filter(c => c !== engine.q.a && !engine.hiddenOptions.includes(c));
    if (wrongChoices.length > 0) { 
      if (engine.setDragonActive) engine.setDragonActive(true);
      playSound(SOUNDS.dragon); 
      setTimeout(() => {
        engine.setIsQuaking?.(true);
        engine.setHiddenOptions?.(prev => [...prev, ...shuffleArray([...wrongChoices]).slice(0, 2)]);
        setTimeout(() => engine.setIsQuaking?.(false), 500);
      }, 400);
      setTimeout(() => { engine.setDragonActive?.(false); }, 1500);
    }
  }, [engineRef]);
  
  const handlePowerReroll = useCallback(() => {
    const engine = engineRef.current;
    if (engine.phase !== "question") return; 
    playSound(SOUNDS.reroll);
    // Prefer nextQuestion so ladder/used-ids stay consistent
    if (engine.nextQuestion) {
      engine.nextQuestion();
      return;
    }
    engine.setQIdx?.(n => n + 1);
    engine.setHiddenOptions?.([]);
    engine.setFeverMode?.(false); 
    engine.stopSpeaking?.(); 
    engine.setPlayers?.(prev => {
      const reset = {};
      Object.keys(prev).forEach(k => { reset[k] = { ...prev[k], currentAnswer: null, status: "idle", speedBonus: 1 }; });
      return reset;
    });
    const nextQ = engine.questionList?.[(engine.qIdx + 1) % (engine.questionList?.length || 1)];
    engine.setTimeLeft?.(nextQ?.difficulty === "crazy" ? Math.max(5, engine.questionDuration - 5) : engine.questionDuration);
  }, [engineRef]);
  
  const handlePowerFeverMode = useCallback(() => {
    const engine = engineRef.current;
    if (engine.phase !== "question") return;
    playSound(SOUNDS.fever);
    engine.setFeverMode?.(true);
  }, [engineRef]);
  
  const handlePowerDoubleScores = useCallback(() => {
    const engine = engineRef.current;
    playSound(SOUNDS.coins);
    const updatedPlayers = {};
    Object.keys(engine.players || {}).forEach(k => {
      const prev = engine.players[k];
      const prevScore = prev.score || 0;
      const newScore = prevScore * 2;
      updatedPlayers[k] = { ...prev, score: newScore };
      engine.celebrateScoreMilestone?.(updatedPlayers[k], prevScore, newScore);
    });
    engine.setPlayers?.(updatedPlayers);
    addToast("🤑 تم مضاعفة نقاط الجميع!", "success");
  }, [engineRef, addToast]);

  const triggerGiftLogic = useCallback((ruleId, sender = null, coinValue = 0) => {
    const engine = engineRef.current;
    if (engine.phase !== "question" && engine.phase !== "idle" && engine.phase !== "result" && engine.phase !== "voting" && engine.phase !== "reveal") return; 
    
    // FIXED: Unbreakable, recursive extractor
    const extractCoins = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseInt(val.replace(/\D/g, ''), 10) || 0;
      if (typeof val === 'object') {
         return extractCoins(val.diamondCount) || 
                extractCoins(val.diamond_count) || 
                extractCoins(val.diamonds) || 
                extractCoins(val.coins) || 
                extractCoins(val.gift) || 0;
      }
      return 0;
    };

    let extractedCoinValue = extractCoins(coinValue);
    if (extractedCoinValue === 0 && sender) extractedCoinValue = extractCoins(sender);

    // FIXED: Stop "Doubling" Math by rejecting duplicate socket payloads
    const rawMsgId = (coinValue && typeof coinValue === 'object' ? (coinValue.msgId || coinValue.msg_id) : null) || sender?.msgId || sender?.msg_id;
    if (rawMsgId) {
      if (processedMsgIds.current.has(rawMsgId)) return; // Block duplicates
      processedMsgIds.current.add(rawMsgId);
      // Keep memory lean
      if (processedMsgIds.current.size > 200) {
        const firstId = processedMsgIds.current.values().next().value;
        processedMsgIds.current.delete(firstId);
      }
    }

    if (sender) {
      donatorsHook.trackDonation(sender, extractedCoinValue); 
    }

    if (ruleId === "manual_fifty") return handlePowerFiftyFifty();
    if (ruleId === "manual_reroll") return handlePowerReroll();
    if (ruleId === "manual_fever") return handlePowerFeverMode();
    if (ruleId === "manual_double") return handlePowerDoubleScores();
    const rule = triggerRules.find(r => r.id === ruleId);
    if (!rule || REMOVED_GIFT_ACTIONS.has(rule.action)) return;
    const actionSounds = { sabotage_blur: SOUNDS.sabotage, vip_sponsor: SOUNDS.vip, play_airhorn: SOUNDS.airhorn, point_steal: SOUNDS.steal, override_vote: SOUNDS.gong, spin_wheel: SOUNDS.spin, add_time: SOUNDS.addTime, remove_wrong: SOUNDS.dragon, fifty_fifty: SOUNDS.dragon, reroll: SOUNDS.reroll, add_points: SOUNDS.coins, fever_mode: SOUNDS.fever, double_scores: SOUNDS.coins, donor_pick: SOUNDS.gong };
    let soundToPlay = actionSounds[rule.action]; if (rule.action.startsWith("cat_")) soundToPlay = SOUNDS.spin; 
    if (soundToPlay) playSound(soundToPlay); 
    const senderPrefix = sender ? `${sender.name} أرسل هدية! ` : "تم تفعيل قدرة! ";
    const blankPlayer = (s) => ({ id: s.id, name: s.name, avatar: s.avatar, score: 0, streak: 0, status: "idle", speedBonus: 1 });
    
    if (rule.action === "donor_pick" && sender) {
      if (engine.setDonorPicker) engine.setDonorPicker(sender);
      if (engine.donorPickerRef) engine.donorPickerRef.current = sender;
      addToast(`👑 فقط ${sender.name} يختار الفئة الآن — الشات مغلق للباقي!`, "warning");
      if (engine.phase !== "voting") engine.startVoting();
      return;
    }
    if (rule.action === "sabotage_blur") { engine.setIsBlurred(true); addToast(`🌫️ ${senderPrefix} طمس الشاشة للجميع!`, "error"); clearTimeout(engine.blurTimer.current); engine.blurTimer.current = setTimeout(() => engine.setIsBlurred(false), Number(rule.value) * 1000); return; }
    if (rule.action === "vip_sponsor" && sender) { engine.setVipSponsor(sender); addToast(`👑 ${senderPrefix} الراعي الرسمي!`, "success"); clearTimeout(engine.vipTimer.current); engine.vipTimer.current = setTimeout(() => engine.setVipSponsor(null), Number(rule.value) * 1000); return; }
    
    if (rule.action === "point_steal" && sender) {
      engine.setPlayers(prev => { 
        const allIds = Object.keys(prev); if(allIds.length === 0) return prev;
        let topId = allIds[0]; for(let id of allIds) { if(prev[id].score > prev[topId].score) topId = id; }
        if (topId === sender.id || prev[topId].score <= 0) return prev;
        const stolen = Math.floor(prev[topId].score * (Number(rule.value) / 100));
        const currentSender = prev[sender.id] || blankPlayer(sender);
        addToast(`🥷 ${senderPrefix} سرق ${stolen} من ${prev[topId].name}!`, "error");
        const prevScore = currentSender.score || 0;
        const newScore = prevScore + stolen;
        const updatedSender = { ...currentSender, score: newScore };
        engine.celebrateScoreMilestone?.(updatedSender, prevScore, newScore);
        return { ...prev, [topId]: { ...prev[topId], score: prev[topId].score - stolen }, [sender.id]: updatedSender };
      }); return;
    }
    
    if (rule.action === "override_vote") { if (engine.phase !== "voting") return; const userVote = engine.votes[sender?.id]; if (userVote !== undefined) engine.endVoting(userVote.choice); return; }
    if (rule.action === "spin_wheel") {
      addToast(`🎲 ${senderPrefix} تدوير العجلة!`, "success");
      if (engine.spinWheel) engine.spinWheel();
      return;
    }
    if (rule.action === "add_time" && engine.phase === "question") { engine.setTimeLeft(prev => prev + Number(rule.value)); } 
    else if (rule.action === "remove_wrong" && engine.phase === "question") {
      const wrongChoices = engine.q?.choices?.filter(c => c !== engine.q.a && !engine.hiddenOptions.includes(c)) || [];
      if (wrongChoices.length > 0) { engine.setHiddenOptions(prev => [...prev, wrongChoices[Math.floor(Math.random() * wrongChoices.length)]]); }
    }
    else if (rule.action === "add_points" && sender) {
      engine.setPlayers(prev => { 
          const currentSender = prev[sender.id] || blankPlayer(sender);
          const prevScore = currentSender.score || 0;
          const newScore = prevScore + Number(rule.value);
          const updated = { ...currentSender, score: newScore };
          engine.celebrateScoreMilestone?.(updated, prevScore, newScore);
          return { ...prev, [sender.id]: updated };
      });
    }
    else if (rule.action === "fifty_fifty" && engine.phase === "question") handlePowerFiftyFifty();
    else if (rule.action === "reroll" && engine.phase === "question") handlePowerReroll();
    else if (rule.action === "fever_mode" && engine.phase === "question") handlePowerFeverMode();
    else if (rule.action === "double_scores") handlePowerDoubleScores();
  }, [triggerRules, handlePowerFiftyFifty, handlePowerReroll, handlePowerFeverMode, handlePowerDoubleScores, donatorsHook, engineRef, addToast]);

  return {
    triggerRules, setTriggerRules,
    getRule, triggerGiftLogic, processedMsgIds
  };
}