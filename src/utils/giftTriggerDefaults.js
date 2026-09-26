import { migrateRuleGiftId } from "./giftsConfig.js";

/** Canonical default paid power-ups — giftIds must exist in TIKTOK_GIFTS. */
export const DEFAULT_GIFT_TRIGGER_RULES = [
  { id: "rule_time", giftId: "rose", action: "add_time", value: 3 },
  { id: "rule_del1", giftId: "finger_heart", action: "remove_wrong", value: 0 },
  { id: "rule_fever", giftId: "doughnut", action: "fever_mode", value: 0 },
  { id: "rule_5050", giftId: "tiktok", action: "fifty_fifty", value: 0 },
  { id: "rule_skip", giftId: "gg", action: "reroll", value: 0 },
  { id: "rule_veto", giftId: "little_crown", action: "override_vote", value: 0 },
  { id: "rule_blur", giftId: "puppy_gamepad", action: "sabotage_blur", value: 5 },
  { id: "rule_steal", giftId: "lion", action: "point_steal", value: 10 },
  { id: "rule_airhorn", giftId: "perfume", action: "play_airhorn", value: 0 },
  { id: "rule_vip", giftId: "tiktok_universe", action: "vip_sponsor", value: 30 },
];

export const REMOVED_GIFT_ACTIONS = new Set(["add_heart", "play_alert"]);
export const TRIGGERS_KEY = "trivia_triggers";

export function saveTriggerRulesToStorage(rules) {
  try {
    const safe = Array.isArray(rules) ? rules : [];
    localStorage.setItem(TRIGGERS_KEY, JSON.stringify(safe));
    return true;
  } catch (err) {
    console.warn("[persist] Failed to save trigger rules", err);
    return false;
  }
}

export function loadTriggerRulesFromStorage() {
  const defaults = DEFAULT_GIFT_TRIGGER_RULES.map((r) => ({
    ...r,
    giftId: migrateRuleGiftId(r.giftId),
  }));
  const saved = localStorage.getItem(TRIGGERS_KEY);
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaults;
    // Empty array was an intentional "مسح الكل" — keep it (don't force defaults)
    const migrated = parsed
      .map((r) => ({
        ...r,
        giftId: migrateRuleGiftId(r.giftId || "rose"),
        action: r.action,
        value: r.value,
        id: r.id || `rule_${Date.now()}`,
      }))
      .filter((r) => r && !REMOVED_GIFT_ACTIONS.has(r.action) && r.type !== "user_event");
    return migrated.map((r) => {
      const def = defaults.find((d) => d.id === r.id);
      if (!def) return r;
      const broken = ["crown", "gamepad", "universe"];
      if (broken.includes(String(r.giftId).toLowerCase())) {
        return { ...r, giftId: def.giftId };
      }
      return r;
    });
  } catch {
    return defaults;
  }
}
