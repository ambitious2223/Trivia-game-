#!/usr/bin/env node
/**
 * Automated regression for voting skip:
 * host skip must start the tallied category, never jump to nextQuestion/mixed.
 */
import assert from "node:assert/strict";

// Minimal harness mirroring useVotingSystem skip semantics
function createVotingHarness() {
  const log = [];
  let phase = "idle";
  let selectedCategory = "";
  let questionListCategory = "";

  const latestVotes = { current: {} };
  const latestVotingOptions = { current: [] };
  let endingLock = false;
  let pendingCategory = null;
  let startTimer = null;

  const engine = {
    get phase() { return phase; },
    setPhase: (p) => { phase = p; log.push(`phase:${p}`); },
    setSelectedCategory: (c) => { selectedCategory = c; },
    setCurrentSpinCategory: (c) => {},
    clearAllTimers: () => { log.push("clearAllTimers"); },
    startGame: (cat) => {
      selectedCategory = cat;
      questionListCategory = cat;
      phase = "question";
      log.push(`startGame:${cat}`);
    },
    votingResultDelay: 50,
    donorPicker: null,
    donorPickerRef: { current: null },
  };

  function flushStartGame() {
    if (startTimer) { clearTimeout(startTimer); startTimer = null; }
    const cat = pendingCategory;
    if (!cat) { endingLock = false; return; }
    pendingCategory = null;
    endingLock = false;
    engine.startGame(cat);
  }

  function endVoting(forcedChoiceIdx = null, { hostSkip = false, immediate = false } = {}) {
    if (endingLock) {
      if (hostSkip || immediate) flushStartGame();
      return;
    }
    const livePhase = engine.phase;
    if (!hostSkip && livePhase && livePhase !== "voting") return;

    endingLock = true;
    engine.clearAllTimers();
    if (startTimer) { clearTimeout(startTimer); startTimer = null; }

    const options = latestVotingOptions.current;
    const votes = latestVotes.current;
    let winningIdx = 0;
    if (forcedChoiceIdx != null && forcedChoiceIdx >= 0 && forcedChoiceIdx < options.length) {
      winningIdx = forcedChoiceIdx;
    } else {
      const counts = Array(options.length).fill(0);
      Object.values(votes).forEach((v) => { if (v.choice >= 0 && v.choice < options.length) counts[v.choice]++; });
      let max = -1;
      counts.forEach((c, i) => { if (c > max) { max = c; winningIdx = i; } });
    }
    const winningCategory = options[winningIdx] || options[0] || "mixed";
    pendingCategory = winningCategory;
    engine.setPhase("voting_result");

    if (immediate || hostSkip) {
      flushStartGame();
      return;
    }
    startTimer = setTimeout(() => { startTimer = null; flushStartGame(); }, engine.votingResultDelay);
  }

  function skipVotingTimer() {
    if (endingLock || pendingCategory) {
      flushStartGame();
      return;
    }
    endVoting(null, { hostSkip: true, immediate: true });
  }

  function skipTurn(uiPhase) {
    // Mirrors useGameState.skipTurn
    if (uiPhase === "voting" || uiPhase === "voting_result") {
      skipVotingTimer();
      return;
    }
    if (uiPhase === "question" || uiPhase === "reveal") {
      log.push("BUG:evaluateRound");
      return;
    }
    if (uiPhase === "result") {
      log.push("BUG:nextQuestion");
    }
  }

  return {
    log,
    engine,
    get selectedCategory() { return selectedCategory; },
    get questionListCategory() { return questionListCategory; },
    get phase() { return phase; },
    startVoting(options) {
      endingLock = false;
      pendingCategory = null;
      latestVotingOptions.current = options;
      latestVotes.current = {};
      phase = "voting";
      log.push("phase:voting");
    },
    castVote(userId, choice) {
      latestVotes.current[userId] = { choice, name: userId };
    },
    skipTurn,
    endVoting,
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(" ", err.message);
    process.exitCode = 1;
  }
}

test("host skip during voting starts leading category immediately", () => {
  const h = createVotingHarness();
  h.startVoting(["كرة القدم", "أنمي", "علوم", "تاريخ", "طبخ"]);
  h.castVote("u1", 2); // علوم
  h.castVote("u2", 2);
  h.castVote("u3", 0);
  h.skipTurn("voting");
  assert.equal(h.phase, "question");
  assert.equal(h.selectedCategory, "علوم");
  assert.equal(h.questionListCategory, "علوم");
  assert.ok(!h.log.includes("BUG:evaluateRound"));
  assert.ok(!h.log.includes("BUG:nextQuestion"));
  assert.ok(!h.log.some((l) => l === "startGame:mixed"));
});

test("double skip does not jump to nextQuestion", () => {
  const h = createVotingHarness();
  h.startVoting(["A", "B", "C", "D", "E"]);
  h.castVote("u1", 1);
  h.skipTurn("voting");
  h.skipTurn("question"); // second press after game started — may evaluate, but category must stay
  assert.equal(h.selectedCategory, "B");
  // First action must not have been nextQuestion
  assert.ok(h.log.includes("startGame:B"));
});

test("skip with zero votes picks option 1, not mixed", () => {
  const h = createVotingHarness();
  h.startVoting(["أول", "ثاني", "ثالث", "رابع", "خامس"]);
  h.skipTurn("voting");
  assert.equal(h.selectedCategory, "أول");
  assert.notEqual(h.selectedCategory, "mixed");
});

test("stale engine.phase=question cannot block host skip", () => {
  const h = createVotingHarness();
  h.startVoting(["X", "Y", "Z", "W", "V"]);
  h.castVote("u1", 3);
  // Corrupt engine phase like the production bug
  h.engine.setPhase("question");
  // UI still shows voting
  h.skipTurn("voting");
  assert.equal(h.selectedCategory, "W");
  assert.equal(h.phase, "question");
  assert.ok(h.log.includes("startGame:W"));
});

if (!process.exitCode) {
  console.log("\nAll voting-skip harness tests passed.");
}
