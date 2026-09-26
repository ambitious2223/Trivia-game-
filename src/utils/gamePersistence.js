// Durable localStorage helpers for kings/gifters + mid-round session checkpoints.

export const WINNERS_KEY = "trivia_all_time_winners";
export const DONATORS_KEY = "trivia_all_time_donators";
export const SESSION_KEY = "trivia_live_session";
export const SESSION_VERSION = 1;

export function safeParseJSON(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[persist] Failed to write ${key}`, err);
    return false;
  }
}

/** Kings board: { id, name, avatar, wins } */
export function normalizeKingRecord(p) {
  if (!p || typeof p !== "object") return null;
  let wins = p.wins;
  if (wins === undefined || wins === null) {
    const wealth = Number(p.wealth) || 0;
    wins = wealth > 0 && wealth < 50 ? wealth : wealth > 0 ? 1 : 0;
  }
  const id = p.id != null ? String(p.id) : "";
  if (!id) return null;
  return {
    id,
    name: p.name || id,
    avatar: p.avatar || "",
    wins: Math.max(0, Math.floor(Number(wins) || 0)),
  };
}

export function sortByWins(list) {
  return [...list].sort(
    (a, b) =>
      (b.wins || 0) - (a.wins || 0) ||
      String(a.name || "").localeCompare(String(b.name || ""), "ar")
  );
}

export function loadAllTimeWinners() {
  const parsed = safeParseJSON(localStorage.getItem(WINNERS_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return sortByWins(parsed.map(normalizeKingRecord).filter(Boolean));
}

export function saveAllTimeWinners(list) {
  const safe = sortByWins((list || []).map(normalizeKingRecord).filter(Boolean));
  writeJSON(WINNERS_KEY, safe);
  return safe;
}

export function clearAllTimeWinners() {
  try {
    localStorage.removeItem(WINNERS_KEY);
  } catch {
    /* ignore */
  }
}

/** Donators: { id, name, avatar, score } */
export function normalizeDonatorRecord(d) {
  if (!d || typeof d !== "object") return null;
  const id = d.id != null ? String(d.id) : "";
  if (!id) return null;
  return {
    id,
    name: d.name || id,
    avatar: d.avatar || "",
    score: Math.max(0, Number(d.score) || 0),
  };
}

export function loadAllTimeDonators() {
  const parsed = safeParseJSON(localStorage.getItem(DONATORS_KEY), []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(normalizeDonatorRecord)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

export function saveAllTimeDonators(list) {
  const safe = (list || [])
    .map(normalizeDonatorRecord)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  writeJSON(DONATORS_KEY, safe);
  return safe;
}

export function clearAllTimeDonators() {
  try {
    localStorage.removeItem(DONATORS_KEY);
  } catch {
    /* ignore */
  }
}

/** Strip in-flight answers so restore starts clean on the next question. */
export function playersForCheckpoint(players) {
  const out = {};
  Object.keys(players || {}).forEach((id) => {
    const p = players[id];
    if (!p) return;
    out[id] = {
      id: p.id || id,
      name: p.name || id,
      avatar: p.avatar || "",
      score: Math.max(0, Number(p.score) || 0),
      streak: Math.max(0, Number(p.streak) || 0),
      status: "idle",
      currentAnswer: null,
      speedBonus: 1,
      streakMul: 1,
      lastEarned: 0,
      answeredAtTime: undefined,
    };
  });
  return out;
}

/**
 * Checkpoint after a question finishes (scores locked, ready for next index).
 * questionList is stored so the same ladder continues after refresh.
 */
export function saveLiveSession(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.questionList) || snapshot.questionList.length === 0) {
    return false;
  }
  const qIdx = Math.max(0, Math.min(
    Number(snapshot.qIdx) || 0,
    snapshot.questionList.length - 1
  ));
  return writeJSON(SESSION_KEY, {
    version: SESSION_VERSION,
    savedAt: Date.now(),
    qIdx,
    category: snapshot.category || "mixed",
    players: playersForCheckpoint(snapshot.players),
    questionList: snapshot.questionList,
    winGoal: Number(snapshot.winGoal) || 2000,
    sessionLikes: Math.max(0, Number(snapshot.sessionLikes) || 0),
    sessionGifts: Math.max(0, Number(snapshot.sessionGifts) || 0),
    gateBaseline: Math.max(0, Number(snapshot.gateBaseline) || 0),
    gateGiftBaseline: Math.max(0, Number(snapshot.gateGiftBaseline) || 0),
    gateActive: Boolean(snapshot.gateActive),
    gateStep:
      snapshot.gateStep === 5 || snapshot.gateStep === 10
        ? snapshot.gateStep
        : null,
  });
}

export function loadLiveSession() {
  const data = safeParseJSON(localStorage.getItem(SESSION_KEY), null);
  if (!data || typeof data !== "object") return null;
  if (data.version !== SESSION_VERSION) return null;
  if (!Array.isArray(data.questionList) || data.questionList.length === 0) return null;
  if (typeof data.qIdx !== "number" || data.qIdx < 0) return null;
  return {
    ...data,
    qIdx: Math.min(data.qIdx, data.questionList.length - 1),
    players: playersForCheckpoint(data.players || {}),
    category: data.category || "mixed",
    winGoal: Number(data.winGoal) || 2000,
    sessionLikes: Math.max(0, Number(data.sessionLikes) || 0),
    sessionGifts: Math.max(0, Number(data.sessionGifts) || 0),
    gateBaseline: Math.max(0, Number(data.gateBaseline) || 0),
    gateGiftBaseline: Math.max(0, Number(data.gateGiftBaseline) || 0),
    gateActive: Boolean(data.gateActive),
    gateStep:
      data.gateStep === 5 || data.gateStep === 10 ? data.gateStep : null,
  };
}

export function clearLiveSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
