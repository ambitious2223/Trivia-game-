// src/components/Donators.jsx — far-right column: top gifters + gift power menu
import React, { useMemo } from "react";
import { getGiftById } from "../utils/giftsConfig";
import GiftIcon from "./GiftIcon";
import { setImgOfflineFallback } from "../utils/offlineAvatar";

function formatScoreCompact(score) {
  if (!score || isNaN(score)) return "0";
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(score % 1_000_000 === 0 ? 0 : 1) + "M";
  if (score >= 1_000) return (score / 1_000).toFixed(score % 1_000 === 0 ? 0 : 1) + "K";
  return String(score);
}

function shorten(text, max = 9) {
  const s = String(text || "");
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function avatarFallback(name, el) {
  setImgOfflineFallback(el, name, "f1c40f");
}

const ACTION_LABELS = {
  add_time: "وقت+",
  remove_wrong: "حذف",
  fifty_fifty: "50/50",
  fever_mode: "حماس",
  reroll: "تغيير",
  override_vote: "فيتو",
  sabotage_blur: "طمس",
  point_steal: "سرقة",
  play_airhorn: "بوق",
  vip_sponsor: "راعي",
};

export default function Donators({ allTimeDonators = [], triggerRules = [] }) {
  const top = useMemo(
    () =>
      [...(allTimeDonators || [])]
        .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
        .slice(0, 5),
    [allTimeDonators]
  );

  const effects = useMemo(() => {
    return (triggerRules || [])
      .filter((r) => ACTION_LABELS[r.action])
      .slice(0, 10)
      .map((r) => {
        const gift = getGiftById(r.giftId);
        return {
          id: r.id,
          label: ACTION_LABELS[r.action],
          giftId: r.giftId,
          giftName: gift?.name || r.giftId,
        };
      });
  }, [triggerRules]);

  return (
    <aside className="donators-column" aria-label="الداعمون وتأثيرات الهدايا">
      <div className="donators-panel">
        <div className="donators-panel-header">💎 الداعمون</div>
        <div className="donators-list">
          {top.length === 0 ? (
            <div className="donators-empty">أرسل هدية<br />لتظهر هنا</div>
          ) : (
            top.map((d, i) => (
              <div key={d.id || i} className="donators-row" title={d.name}>
                <span className="donators-rank">{i + 1}</span>
                <img src={d.avatar} alt="" onError={(e) => avatarFallback(d.name, e.target)} />
                <div className="donators-meta">
                  <span className="donators-name">{shorten(d.name)}</span>
                  <span className="donators-score">{formatScoreCompact(d.score)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="donators-panel donators-powers-panel">
        <div className="donators-panel-header donators-powers-header">🎁 القدرات</div>
        <div className="donators-powers">
          {effects.length === 0 ? (
            <div className="donators-empty">لا محفزات</div>
          ) : (
            effects.map((it) => (
              <div key={it.id} className="donators-power" title={`${it.giftName} → ${it.label}`}>
                <GiftIcon giftId={it.giftId} size={26} />
                <span>{it.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
