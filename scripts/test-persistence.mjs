/**
 * Unit checks for gamePersistence (all-time boards + live session).
 */
import { webcrypto } from "node:crypto";

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(String(key), String(value));
  }
  removeItem(key) {
    this.map.delete(String(key));
  }
  clear() {
    this.map.clear();
  }
}

globalThis.localStorage = new MemoryStorage();
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const {
  loadAllTimeWinners,
  saveAllTimeWinners,
  loadAllTimeDonators,
  saveAllTimeDonators,
  saveLiveSession,
  loadLiveSession,
  clearLiveSession,
  playersForCheckpoint,
  prunePlayers,
  normalizeKingRecord,
  MAX_TRACKED_PLAYERS,
  MAX_TRACKED_DONATORS,
  SESSION_KEY,
  WINNERS_KEY,
  DONATORS_KEY,
} = await import("../src/utils/gamePersistence.js");

let failed = 0;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed += 1;
};
const ok = (msg) => console.log(`OK:   ${msg}`);

// Corrupt winners JSON must not throw
localStorage.setItem(WINNERS_KEY, "{not-json");
const winnersCorrupt = loadAllTimeWinners();
if (!Array.isArray(winnersCorrupt) || winnersCorrupt.length !== 0) {
  fail("corrupt winners should load as []");
} else ok("corrupt winners → []");

// Sync save winners + migrate wealth
const saved = saveAllTimeWinners([
  { id: "u1", name: "Ali", avatar: "a", wealth: 3 },
  { id: "u2", name: "Sara", avatar: "b", wins: 5 },
]);
if (saved[0].id !== "u2" || saved[0].wins !== 5) fail("winners sort/wins wrong");
else ok("winners sync save + sort by wins");

const reloaded = loadAllTimeWinners();
if (reloaded.length !== 2 || normalizeKingRecord(reloaded[1]).wins !== 3) {
  fail("wealth→wins migration failed");
} else ok("wealth→wins migration");

// Corrupt donators
localStorage.setItem(DONATORS_KEY, "null");
if (loadAllTimeDonators().length !== 0) fail("null donators should be []");
else ok("null donators → []");

saveAllTimeDonators([{ id: "d1", name: "GiftKing", score: 100 }]);
if (loadAllTimeDonators()[0]?.score !== 100) fail("donators save/load");
else ok("donators sync save/load");

// Session checkpoint
clearLiveSession();
const ladder = [
  { id: "q1", q: "Q1?", a: "1", choices: ["1", "2"], difficulty: "easy" },
  { id: "q2", q: "Q2?", a: "2", choices: ["1", "2"], difficulty: "easy" },
];
saveLiveSession({
  qIdx: 1,
  category: "mixed",
  players: {
    p1: { id: "p1", name: "Bot", score: 150, currentAnswer: "1", status: "answered", streak: 2 },
  },
  questionList: ladder,
  winGoal: 2000,
});

const session = loadLiveSession();
if (!session || session.qIdx !== 1) fail("session qIdx");
else if (session.players.p1?.currentAnswer != null) fail("checkpoint should strip answers");
else if (session.players.p1?.score !== 150) fail("checkpoint should keep score");
else if (session.players.p1?.status !== "idle") fail("checkpoint status idle");
else ok("live session checkpoint strips answers, keeps scores");

const cleaned = playersForCheckpoint({ x: { id: "x", score: 10, currentAnswer: "3" } });
if (cleaned.x.currentAnswer != null) fail("playersForCheckpoint");
else ok("playersForCheckpoint helper");

// prunePlayers: drops 0-score spectators, keeps scorers and current answerers
const bigMap = {};
for (let i = 0; i < MAX_TRACKED_PLAYERS + 50; i++) {
  bigMap[`spec_${i}`] = { id: `spec_${i}`, name: `S${i}`, score: 0, currentAnswer: null };
}
bigMap.s1 = { id: "s1", name: "s1", score: 500, currentAnswer: null };
bigMap.s2 = { id: "s2", name: "s2", score: 100, currentAnswer: null };
bigMap.a1 = { id: "a1", name: "a1", score: 0, currentAnswer: "2" };
const pruned = prunePlayers(bigMap);
if (pruned.s1?.score !== 500) fail("prunePlayers should keep scorers");
else if (pruned.a1?.currentAnswer !== "2") fail("prunePlayers should keep answerers");
else if (Object.keys(pruned).length > MAX_TRACKED_PLAYERS + 1) fail("prunePlayers should cap size");
else if (pruned.spec_0) fail("prunePlayers should drop 0-score spectators");
else ok("prunePlayers bounds the player map, keeps scorers + answerers");

// cap kept answerers + scorers to the configured limit
const onlyScorers = {};
for (let i = 0; i < MAX_TRACKED_PLAYERS + 25; i++) {
  onlyScorers[`p${i}`] = { id: `p${i}`, score: i + 1 };
}
const capped = prunePlayers(onlyScorers);
if (Object.keys(capped).length !== MAX_TRACKED_PLAYERS) fail("prunePlayers cap by score");
else ok("prunePlayers caps scorers to MAX_TRACKED_PLAYERS");

// Save must not throw when localStorage is full (quota)
const realSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
let threw = false;
try {
  saveLiveSession({
    qIdx: 0,
    category: "mixed",
    players: { p1: { id: "p1", score: 10 } },
    questionList: [{ id: "q1", q: "Q?", a: "1", choices: ["1", "2"] }],
  });
} catch {
  threw = true;
}
localStorage.setItem = realSetItem;
if (threw) fail("saveLiveSession should swallow quota errors");
else ok("saveLiveSession survives quota errors");

// Donators are capped to the leaderboard size
const manyDonators = Array.from({ length: MAX_TRACKED_DONATORS + 20 }, (_, i) => ({
  id: `d${i}`,
  name: `D${i}`,
  score: i,
}));
saveAllTimeDonators(manyDonators);
if (loadAllTimeDonators().length > MAX_TRACKED_DONATORS) fail("donators cap");
else ok("donators capped to MAX_TRACKED_DONATORS");

localStorage.setItem(SESSION_KEY, '{"version":999}');
if (loadLiveSession() !== null) fail("bad session version should be null");
else ok("reject unknown session version");

clearLiveSession();
if (loadLiveSession() !== null) fail("clearLiveSession");
else ok("clearLiveSession");

if (failed > 0) {
  console.error(`\n${failed} persistence test(s) failed`);
  process.exit(1);
}
console.log("\nAll persistence tests passed");
