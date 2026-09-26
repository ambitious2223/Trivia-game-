// src/components/App.jsx
import React, { useEffect } from "react"; 
import "../styles/App.css"; 
import DebugMenu from "./DebugMenu"; 
import DraggableToasts from "./DraggableToasts";
import Sidebar from "./Sidebar";
import ResultScreen from "./ResultScreen"; 
import VotingScreen from "./VotingScreen"; 
import QuestionBoard from "./QuestionBoard"; 
import GameOverScreen from "./GameOverScreen"; 
import CategoryWheel from "./CategoryWheel"; 
import LikesCheckpointScreen from "./LikesCheckpointScreen"; 
import { useGameState } from "../hooks/useGameState"; 
import { getAllCategories } from "../utils/QuestionManager"; 
import { preloadAllAudio, stopAllAudio, unlockAudio } from "../utils/Sounds"; 
import { offlineAvatarDataUri } from "../utils/offlineAvatar"; 

const QuestionTab = ({ gameState }) => {
  const centeredPhase =
    gameState.phase === "wheel" ||
    gameState.phase === "voting" ||
    gameState.phase === "voting_result" ||
    gameState.phase === "likes_gate" ||
    gameState.phase === "gameover";

  return (
    <div className="trivia-column">
      <div
        className="panel"
        style={{
          borderColor: gameState.phase === "likes_gate"
            ? "#ff7675"
            : gameState.feverMode
              ? "#e67e22"
              : gameState.isCrazy
                ? "#e74c3c"
                : "rgba(255,255,255,0.1)",
          justifyContent: centeredPhase ? "center" : "flex-start",
        }}
      >
        <div className="trivia-brand-header">
          <style>{`
            @keyframes goldGlowPulse {
              0% { text-shadow: 0 0 10px rgba(255, 215, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.3); transform: scale(1); }
              50% { text-shadow: 0 0 25px rgba(255, 215, 0, 0.9), 0 0 40px rgba(218, 165, 32, 0.6); transform: scale(1.02); }
              100% { text-shadow: 0 0 10px rgba(255, 215, 0, 0.6), 0 0 20px rgba(255, 215, 0, 0.3); transform: scale(1); }
            }
            .animated-millionaire-title {
              font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
              font-size: 2.3rem;
              font-weight: 900;
              background: linear-gradient(180deg, #ffffff 0%, #ffeaa7 30%, #ffd700 70%, #d4af37 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              margin: 0;
              padding: 0;
              direction: rtl;
              display: inline-block;
              animation: goldGlowPulse 2.5s infinite ease-in-out;
              filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.8));
            }
          `}</style>
          <h1 className="animated-millionaire-title">من سيربح المليون 💰🏆</h1>
          {(() => {
            const leader = Object.values(gameState.players || {}).sort((a, b) => b.score - a.score)[0];
            if (!leader || !(gameState.phase === "question" || gameState.phase === "reveal" || gameState.phase === "result")) return null;
            return (
              <div className="king-of-hill-banner">
                <img
                  src={leader.avatar}
                  alt=""
                  onError={(e) => { e.target.onerror = null; e.target.src = offlineAvatarDataUri(leader.name || "U", "ffd700", "000000"); }}
                />
                <span>👑 المتصدر: <strong>{leader.name}</strong> — {leader.score}</span>
              </div>
            );
          })()}
        </div>

        <div className="panel-stage">
          {gameState.phase === "gameover" && (
            <GameOverScreen gameState={gameState} />
          )}

          {(gameState.phase === "voting" || gameState.phase === "voting_result") && (
            <VotingScreen
              phase={gameState.phase}
              votingOptions={gameState.votingOptions}
              votes={gameState.votes}
              votingTimeLeft={gameState.votingTimeLeft}
              votingDuration={gameState.votingDuration || gameState.voteDuration || 30}
              votingResult={gameState.votingResult}
              overrideRule={gameState.getRule("override_vote")}
              donorPicker={gameState.donorPicker}
            />
          )}

          {gameState.phase === "wheel" && (
            <CategoryWheel
              categories={getAllCategories()}
              isSpinning={gameState.wheelSpinning}
              selectedCategory={gameState.selectedCategory}
            />
          )}

          {gameState.phase === "likes_gate" && (
            <LikesCheckpointScreen gameState={gameState} />
          )}

          {(gameState.phase === "question" || gameState.phase === "reveal") && (
            <QuestionBoard gameState={gameState} />
          )}

          {gameState.phase === "result" && (
            <ResultScreen gameState={gameState} />
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const gameState = useGameState(); 

  useEffect(() => {
    if (gameState.triggerRules !== undefined) {
      try {
        localStorage.setItem("trivia_triggers", JSON.stringify(gameState.triggerRules));
      } catch (err) {
        console.warn("[persist] triggerRules write failed", err);
      }
    }
  }, [gameState.triggerRules]);

  useEffect(() => {
    // Kill any leftover music/SFX from hot reload or prior test sessions
    stopAllAudio();
    preloadAllAudio();
    localStorage.removeItem("trivia_saved_alerts");
    // Removed features — clear stale keys from older builds
    localStorage.removeItem("trivia_custom_tickers");
    localStorage.removeItem("trivia_show_defaults");
    localStorage.removeItem("trivia_show_autoads");
    localStorage.removeItem("trivia_ticker_speed");
    localStorage.removeItem("trivia_gift_vertical_offset");
    return () => stopAllAudio();
  }, []);

  // Silence when sitting on the start screen
  useEffect(() => {
    if (gameState.phase === "idle") stopAllAudio();
  }, [gameState.phase]);

  const handleFirstInteraction = () => {
    // Capture-phase unlock so game buttons can play audio on the same click
    unlockAudio();
    if (window.audioUnlocked) return;
    window.audioUnlocked = true;
    const silentAudio = new Audio("data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
    silentAudio.play().catch(() => {});
    const context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === "suspended") context.resume();
  };

  return (
      <div onClickCapture={handleFirstInteraction} style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden", direction: "ltr", background: "radial-gradient(circle at center, #143958, #0c2337)" }}>
        
        <DebugMenu 
          onTriggerGift={gameState.triggerGiftLogic} 
          onSimulateViewer={() => {
            const botIdNum = Math.floor(Math.random() * 20) + 1; 
            const user = { id: `bot_${botIdNum}`, name: `Bot_${botIdNum}`, avatar: `https://i.pravatar.cc/150?img=${botIdNum}` };
            if (gameState.phase === "voting") window.handleGlobalChat(user.id, user.name, user.avatar, String(Math.floor(Math.random() * 5) + 1));
            else if (gameState.phase === "question" || gameState.phase === "reveal") {
              const choices = gameState.q?.choices || [];
              const randomChoice = Math.random() > 0.4 ? gameState.q?.a : choices[Math.floor(Math.random() * (choices.length || 1))];
              const originalIndex = choices.indexOf(randomChoice);
              const useMap = Array.isArray(gameState.shuffleMap) && gameState.shuffleMap.length === choices.length;
              const displayIndex = useMap ? gameState.shuffleMap.indexOf(originalIndex) : originalIndex;
              const finalAnswer = Math.random() > 0.5 ? String(displayIndex + 1) : randomChoice;
              window.handleGlobalChat(user.id, user.name, user.avatar, finalAnswer);
            }
          }}
          onSkip={gameState.skipTurn} 
          currentGoal={gameState.winGoal} onUpdateGoal={gameState.setWinGoal} onReset={() => gameState.startGame()} 
          triggerRules={gameState.triggerRules} setTriggerRules={gameState.setTriggerRules}    
          questionDuration={gameState.questionDuration} onUpdateQuestionDuration={gameState.setQuestionDuration}
          resultDuration={gameState.resultDuration} onUpdateResultDuration={gameState.setResultDuration}
          
          votingDuration={gameState.votingDuration || gameState.voteDuration || 30} 
          onUpdateVotingDuration={gameState.setVotingDuration || gameState.setVoteDuration || (() => {})}
          
          isPaused={gameState.isPaused} onTogglePause={() => gameState.setIsPaused(!gameState.isPaused)}
          onAddWinner={gameState.handleAddManualWinner} categories={getAllCategories()} 
          onForceCategory={(cat) => gameState.startGame(cat, true)} onStartRandom={() => gameState.spinWheel()} 
          
          onStartVoting={() => gameState.startVoting(gameState.votingDuration || gameState.voteDuration || 30)} 
          
          onEmergencyClear={gameState.emergencyClear} 
          
          globalLikes={gameState.globalLikes}
          sessionLikes={gameState.sessionLikes}
          sessionGifts={gameState.sessionGifts}
          setSessionGifts={gameState.setSessionGifts}
          gateActive={gameState.gateActive}
          gateProgress={gameState.gateProgress}
          gateRemaining={gameState.gateRemaining}
          gateTarget={gameState.gateTarget}
          setGateTarget={gameState.setGateTarget}
          gateStep={gameState.gateStep}
          gateKind={gameState.gateKind}
          gateMode={gameState.gateMode}
          setGateMode={gameState.setGateMode}
          gateEvery={gameState.gateEvery}
          setGateEvery={gameState.setGateEvery}
          addManualLikes={gameState.addManualLikes}
          addGiftRequest={gameState.addGiftRequest}
          setGlobalLikes={gameState.setGlobalLikes}
          setSessionLikes={gameState.setSessionLikes}
          forceCompleteLikesGate={gameState.forceCompleteLikesGate}
          skipLikesGate={gameState.skipLikesGate}
          likesEnabled={gameState.likesEnabled}       
          setLikesEnabled={gameState.setLikesEnabled} 
          likesLabel={gameState.likesLabel}
          setLikesLabel={gameState.setLikesLabel}
          votingGateTitle={gameState.votingGateTitle}
          setVotingGateTitle={gameState.setVotingGateTitle}

          usedQuestionIds={gameState.usedQuestionIds}
          setUsedQuestionIds={gameState.setUsedQuestionIds}
          questionList={gameState.questionList}
          qIdx={gameState.qIdx}
          currentCategory={gameState.currentCategory}

          isTTSMuted={gameState.isTTSMuted}
          setIsTTSMuted={gameState.setIsTTSMuted}
          ttsPersona={gameState.ttsPersona}
          setTtsPersona={gameState.setTtsPersona}
          players={gameState.players}
          handleAddManualWinner={gameState.handleAddManualWinner}
          
          allTimeWinners={gameState.allTimeWinners}
          allTimeDonators={gameState.allTimeDonators}
          handleRenameWinner={gameState.handleRenameWinner}
          handleRenameDonator={gameState.handleRenameDonator}
          handleClearAllDonators={gameState.handleClearAllDonators}
          handleDeleteDonator={gameState.handleDeleteDonator}
          handleRefreshDonatorImages={gameState.handleRefreshDonatorImages}
          feverMode={gameState.feverMode}
          setFeverMode={gameState.setFeverMode}

          shuffleAnswers={gameState.shuffleAnswers}
          setShuffleAnswers={gameState.setShuffleAnswers}
          addTime={gameState.addTime}

          ttsSpeed={gameState.ttsSpeed}
          setTtsSpeed={gameState.setTtsSpeed}
          revealDelay={gameState.revealDelay}
          setRevealDelay={gameState.setRevealDelay}
          evalDelay={gameState.evalDelay}
          setEvalDelay={gameState.setEvalDelay}
          votingResultDelay={gameState.votingResultDelay}
          setVotingResultDelay={gameState.setVotingResultDelay}
          wheelResultDelay={gameState.wheelResultDelay} 
          setWheelResultDelay={gameState.setWheelResultDelay} 

          isLiveState={gameState.isLiveState}
          setIsLiveState={gameState.setIsLiveState}

          connectionStatus={gameState.connectionStatus}
          socketConnected={gameState.socketConnected}
          onConnectTikTok={gameState.connectTikTok}
          onDisconnectTikTok={gameState.disconnectTikTok}
          onRequestTikTokStatus={gameState.requestStatus}
        />

        {gameState.vipSponsor && (
          <div className="vip-overlay">
            <div className="vip-banner-huge">
              <div className="vip-title">👑 الراعي الرسمي للعبة 👑</div>
              <img 
                src={gameState.vipSponsor.avatar} 
                alt="VIP" 
                onError={(e) => { e.target.onerror = null; e.target.src = offlineAvatarDataUri(gameState.vipSponsor.name || "VIP", "ffd700", "000000"); }} 
              />
              <div className="vip-name">{gameState.vipSponsor.name}</div>
            </div>
          </div>
        )}

        <DraggableToasts toasts={gameState.toasts} />

        {(!gameState.socketConnected || gameState.isPaused) && gameState.phase !== "idle" && (
          <div className="bridge-status-banner" role="status">
            {!gameState.socketConnected
              ? "🔴 انقطع جسر التيك توك — اللعبة متوقفة مؤقتاً"
              : "⏸ اللعبة متوقفة مؤقتاً"}
          </div>
        )}

        <div className="app" style={{ flex: 1, direction: "rtl", overflow: "hidden", position: "relative" }}>
          {gameState.phase === "idle" ? (
            <div className="panel" style={{maxWidth: 600, margin: "100px auto", textAlign: "center", padding: 40}}>
              <div style={{fontSize: 64, marginBottom: 16}}>🧠</div>
              <div style={{fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 20}}>مسابقة الذكاء التفاعلية</div>
              <div style={{color: "#ffd700", fontWeight: 900, marginBottom: 30}}>15 سؤال — صاحب أعلى نقاط يفوز!</div>
              <div style={{display: "flex", gap: "10px", justifyContent: "center"}}>
                  <button className="btn-start" onClick={() => gameState.startVoting(gameState.votingDuration || gameState.voteDuration || 30)} style={{background: "#8e44ad", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold"}}>🗳️ بدء تصويت</button>
                  <button className="btn-start" onClick={() => gameState.startGame()} style={{background: "#2980b9", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold"}}>▶ بدء عشوائي</button>
              </div>
            </div>
          ) : (
            <div className={`main-layout ${gameState.isQuaking ? "quake-effect" : ""}`}>
              {/* LTR row: board | players/kings */}
                <QuestionTab gameState={gameState} />

              <Sidebar
                players={gameState.players}
                winGoal={gameState.winGoal}
                phase={gameState.phase}
                q={gameState.q}
                shuffleMap={gameState.shuffleMap}
                qIdx={gameState.qIdx}
                questionList={gameState.questionList}
                allTimeWinners={gameState.allTimeWinners}
                onAdjustWins={gameState.handleAdjustWins}
                onClearAllTime={gameState.handleClearAllTime}
                onDeleteWinner={gameState.handleDeleteWinner}
                onRefreshImages={gameState.handleRefreshWinnerImages}
              />
            </div>
          )}
        </div>
      </div>
  );
}
