import React from "react";
import GiftIcon from "./GiftIcon";

export default function VotingScreen({ 
  phase, 
  votingOptions, 
  votes, 
  votingTimeLeft, 
  votingResult, 
  overrideRule,
  donorPicker = null,
}) {
  const isDictatorMode = !!donorPicker;

  const renderGiftIcon = (rule, size = 32) => {
    if (!rule) return null;
    const px = typeof size === "string" ? parseInt(size, 10) || 32 : size;
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

  if (phase === "voting_result" && votingResult) {
    const dictatorName = votingResult.dictatorName || votingResult.voters?.[0]?.name;
    return (
      <div style={{ textAlign: "center", width: "100%", margin: "auto" }}>
        <h2 style={{ fontSize: "42px", color: votingResult.wasForced ? "#f1c40f" : "#2ecc71", marginBottom: "20px", textShadow: "0 0 20px rgba(46,204,113,0.5)" }}>
          {votingResult.wasForced
            ? (dictatorName ? `👑 ${dictatorName} اختار الفئة!` : "👑 تم حسم الاختيار!")
            : "🏆 انتهى التصويت!"}
        </h2>
        <h1 style={{ fontSize: "50px", color: "#fff", marginBottom: "30px" }}>
          فازت فئة: <span style={{ color: "#ffd700" }}>{votingResult.category}</span>
        </h1>
        {!votingResult.wasForced && (
          <>
            <p style={{ fontSize: "22px", color: "#ccc", marginBottom: "15px" }}>المصوتون لهذه الفئة ({votingResult.voters.length}):</p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", padding: "20px", background: "rgba(0,0,0,0.5)", borderRadius: "16px", minHeight: "100px" }}>
              {votingResult.voters.length > 0 ? (
                votingResult.voters.map(v => (
                  <div key={v.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: "popIn 0.5s ease" }}>
                    <img src={v.avatar} title={v.name} style={{ width: "60px", height: "60px", borderRadius: "50%", border: "3px solid #ffd700", objectFit: "cover" }} />
                    <span style={{ fontSize: "12px", color: "#fff", marginTop: "5px", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: "#aaa", fontSize: "18px", alignSelf: "center" }}>لم يصوت أحد لهذه الفئة.</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === "voting" && isDictatorMode) {
    return (
      <div style={{ textAlign: "center", width: "100%", margin: "auto" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "16px",
          background: "linear-gradient(135deg, rgba(241,196,15,0.25), rgba(0,0,0,0.55))",
          border: "3px solid #f1c40f",
          borderRadius: "20px",
          padding: "14px 28px",
          marginBottom: "18px",
          boxShadow: "0 0 30px rgba(241,196,15,0.35)"
        }}>
          <img
            src={donorPicker.avatar}
            alt=""
            style={{ width: "72px", height: "72px", borderRadius: "50%", border: "4px solid #f1c40f", objectFit: "cover" }}
            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(donorPicker.name || "D")}&background=f1c40f&color=000`; }}
          />
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#f1c40f", fontWeight: 900, fontSize: "28px" }}>👑 اختيار الداعم</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: "22px" }}>{donorPicker.name}</div>
          </div>
        </div>

        <h2 style={{ fontSize: "32px", color: "#ffd700", marginBottom: "8px" }}>فقط هو يختار الفئة!</h2>
        <p style={{ fontSize: "18px", color: "#fff", margin: "0 0 8px 0" }}>
          الشات مغلق للتصويت العام — القرار لـ <span style={{ color: "#f1c40f", fontWeight: "bold" }}>{donorPicker.name}</span> وحده
        </p>
        <p style={{ fontSize: "18px", color: "#e74c3c", fontWeight: "bold", marginBottom: "20px" }}>
          اكتب رقم الفئة في الشات ({votingTimeLeft}ث)
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "90%", margin: "0 auto" }}>
          {votingOptions.map((cat, idx) => (
            <div key={idx} style={{ background: "rgba(0,0,0,0.6)", borderRadius: "16px", padding: "15px 20px", border: "2px solid #f1c40f55" }}>
              <div style={{ fontSize: "26px", fontWeight: "900", color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
                <span style={{ background: "#f1c40f", color: "#000", padding: "2px 14px", borderRadius: "8px" }}>{idx + 1}</span>
                {cat}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "voting") {
    return (
      <div style={{ textAlign: "center", width: "100%", margin: "auto" }}>
        <h2 style={{ fontSize: "36px", color: "#ffd700", marginBottom: "10px", textShadow: "0 0 15px rgba(255,215,0,0.5)" }}>🗳️ تصويت الفئة القادمة!</h2>
        <p style={{ fontSize: "20px", color: "#fff", margin: "0 0 20px 0" }}>اكتب رقم الفئة في الشات للتصويت <span style={{color:"#e74c3c", fontWeight:"bold"}}>(أمامك {votingTimeLeft} ثانية)</span></p>
        
        {overrideRule && (
          <div className="action-hint pulse-fever" style={{marginBottom: "25px", fontSize: "18px", padding: "8px 20px"}}>
            👑 احسم التصويت فوراً لصالحك! {renderGiftIcon(overrideRule)}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "90%", margin: "0 auto" }}>
          {votingOptions.map((cat, idx) => {
            const optionVoters = Object.values(votes).filter(v => v.choice === idx);
            const totalVotes = Math.max(1, Object.keys(votes).length);
            const pct = Math.max(5, (optionVoters.length / totalVotes) * 100);
            
            return (
              <div key={idx} style={{ background: "rgba(0,0,0,0.6)", borderRadius: "16px", padding: "15px 20px", border: "2px solid #34495e", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: `${pct}%`, background: "linear-gradient(90deg, #2ecc71, #27ae60)", opacity: 0.3, transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "26px", fontWeight: "900", color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
                    <span style={{ background: "#fff", color: "#000", padding: "2px 14px", borderRadius: "8px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>{idx + 1}</span>
                    {cat}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffd700", textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>{optionVoters.length} صوت</div>
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap", position: "relative", zIndex: 2, minHeight: "34px" }}>
                  {optionVoters.slice(0, 18).map(v => (
                    <img key={v.name} src={v.avatar} title={v.name} style={{ width: "34px", height: "34px", borderRadius: "50%", border: "2px solid #fff", objectFit: "cover", animation: "popInBounce 0.3s ease" }} />
                  ))}
                  {optionVoters.length > 18 && <span style={{ color: "#aaa", fontSize: "14px", alignSelf: "center", fontWeight: "bold" }}>+{optionVoters.length - 18}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
