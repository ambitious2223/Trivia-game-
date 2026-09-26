/**
 * Live-verify default paid power-up gift IDs resolve in the catalog
 * and that each action has a distinct gift binding.
 */
import {
  ACTIVE_RULE_GIFT_IDS,
  findGiftDef,
  getGiftById,
  migrateRuleGiftId,
  resolveGiftId,
  TIKTOK_GIFTS,
} from "../src/utils/giftsConfig.js";
import { DEFAULT_GIFT_TRIGGER_RULES } from "../src/utils/giftTriggerDefaults.js";

const PAID_ACTIONS = [
  "add_time",
  "remove_wrong",
  "fever_mode",
  "fifty_fifty",
  "reroll",
  "override_vote",
  "sabotage_blur",
  "point_steal",
  "play_airhorn",
  "vip_sponsor",
];

let failed = 0;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed += 1;
};
const ok = (msg) => console.log(`OK:   ${msg}`);

// Alias resolution
for (const [alias, expected] of [
  ["crown", "little_crown"],
  ["gamepad", "puppy_gamepad"],
  ["universe", "tiktok_universe"],
]) {
  const got = resolveGiftId(alias);
  if (got !== expected) fail(`alias ${alias} → ${got} (expected ${expected})`);
  else ok(`alias ${alias} → ${expected}`);
}

// Defaults map to real catalog IDs + unique giftIds
const seenGifts = new Set();
for (const rule of DEFAULT_GIFT_TRIGGER_RULES) {
  const id = migrateRuleGiftId(rule.giftId);
  const def = findGiftDef(id);
  if (!def) fail(`rule ${rule.id} giftId "${rule.giftId}" not in catalog`);
  else ok(`rule ${rule.id} → ${def.id} (${def.name}) action=${rule.action}`);

  if (seenGifts.has(id)) fail(`duplicate gift binding: ${id} (rule ${rule.id})`);
  else seenGifts.add(id);

  if (!PAID_ACTIONS.includes(rule.action)) fail(`unexpected action ${rule.action}`);
}

for (const action of PAID_ACTIONS) {
  if (!DEFAULT_GIFT_TRIGGER_RULES.some((r) => r.action === action)) {
    fail(`missing default rule for action ${action}`);
  }
}

for (const id of ACTIVE_RULE_GIFT_IDS) {
  if (!findGiftDef(id)) fail(`ACTIVE_RULE_GIFT_IDS missing catalog entry: ${id}`);
}

// getGiftById must not Rose-fallback for known aliases
const vip = getGiftById("universe");
if (vip?.id !== "tiktok_universe") fail(`getGiftById(universe) → ${vip?.id}`);
else ok("getGiftById(universe) → tiktok_universe");

console.log(`\nCatalog size: ${TIKTOK_GIFTS.length}`);
console.log(failed ? `\n${failed} failure(s)` : "\nAll gift-map checks passed.");
process.exit(failed ? 1 : 0);
