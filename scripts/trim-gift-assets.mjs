/**
 * Keep only gift PNGs used by active paid rules (+ optional --keep-all to dry-run).
 * Usage:
 *   node scripts/trim-gift-assets.mjs           # delete unused
 *   node scripts/trim-gift-assets.mjs --dry     # report only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_RULE_GIFT_IDS, TIKTOK_GIFTS } from "../src/utils/giftsConfig.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const giftsDir = path.join(root, "public", "assets", "GIFTS PNGS");
const dry = process.argv.includes("--dry");

const keepFiles = new Set();
for (const g of TIKTOK_GIFTS) {
  if (!ACTIVE_RULE_GIFT_IDS.includes(g.id)) continue;
  const file = path.basename(g.icon || "");
  if (file) keepFiles.add(file);
}

if (!fs.existsSync(giftsDir)) {
  console.error("Gifts directory missing:", giftsDir);
  process.exit(1);
}

const all = fs.readdirSync(giftsDir).filter((f) => f.toLowerCase().endsWith(".png"));
const remove = all.filter((f) => !keepFiles.has(f));
let bytes = 0;
for (const f of remove) {
  const p = path.join(giftsDir, f);
  bytes += fs.statSync(p).size;
  if (!dry) fs.unlinkSync(p);
}

console.log(`Keep:   ${keepFiles.size} active rule icons`);
console.log(`Total:  ${all.length} PNGs`);
console.log(`${dry ? "Would remove" : "Removed"}: ${remove.length} files (~${(bytes / (1024 * 1024)).toFixed(1)} MB)`);
if (dry) console.log("(dry run — re-run without --dry to delete)");
