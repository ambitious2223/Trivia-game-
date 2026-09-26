# Live Verification Checklist

Run this once against a real TikTok Live session (or the debug panel) before
declaring a build shippable. Automated tests (`npm test`) cover the logic;
this checklist covers the end-to-end behavior they can't.

Record the build under test (commit SHA) and the date at the top.

- **Commit:** `____________`
- **Date:** `____________`
- **Tester:** `____________`

---

## 1. Pre-flight

- [ ] `npm install` completes with no errors.
- [ ] `npm run lint` → `0 problems`.
- [ ] `npm test` → all suites pass.
- [ ] `npm run build` → succeeds.
- [ ] `.env` exists (copy from `.env.example`) and `VITE_BRIDGE_URL` points at
      the bridge (`http://localhost:4480` for local).
- [ ] `npm run start:live` starts **both** bridge (`:4480`) and Vite (`:4481`).
- [ ] App loads at http://localhost:4481 with no console errors.

## 2. TikTok connection

- [ ] Bridge logs a successful connection (direct TikTok or TikFinity).
- [ ] UI shows the green "connected" toast/status.
- [ ] A real chat message from another account appears in the app.
- [ ] Disconnecting mid-game auto-pauses the round (red toast) without crashing.
- [ ] Reconnecting does **not** auto-resume — host must unpause.

## 3. Answer scoring (highest priority)

Use the debug panel's **simulate viewer** and/or real chat for each row.
Enable **shuffle answers** for at least half of these.

- [ ] Correct **option number** (`1`–`4`) scores correct.
- [ ] Correct **answer text** (exact copy of the choice) scores correct.
- [ ] Answer text with **punctuation/emoji** (e.g. `القلب. 👍`) scores correct.
- [ ] Answer with **different alif/hamza/teh-marbuta** spelling scores correct
      (e.g. `الاسد` for `الأسد`, `الحمامه` for `الحمامة`).
- [ ] **Arabic-Indic digits** (`١`, `٢`) score correct.
- [ ] **`الجواب 3`**-style labelled number scores correct.
- [ ] **Shuffle ON**: the number a viewer sees on screen maps to the right choice
      (board order and scoring agree).
- [ ] **Buzzer-beater**: answer sent right as the timer hits 0 (during the reveal
      grace window) still counts.
- [ ] A wrong option number scores wrong.
- [ ] Random chatter (no number, no choice text) is ignored — the player can still
      answer afterwards.
- [ ] A player cannot change their answer once submitted.
- [ ] Unanswered players are shown as "صمت" (no answer) at reveal.

## 4. Scoring math

- [ ] Points follow difficulty (easy 50 / medium 100 / hard 200 / crazy 200).
- [ ] Speed bonus applies (2× in first 20%, 1.5× in first 50%).
- [ ] Streak multiplier applies from 3 correct in a row (capped 2×).
- [ ] Fever mode doubles the awarded points.
- [ ] Milestone toast fires once when a player crosses the win goal.
- [ ] Final winner gains exactly **+1 win** (not points).

## 5. Category voting & wheel

- [ ] Voting screen shows 5 shuffled categories and a countdown.
- [ ] Votes tally correctly; the leading category wins.
- [ ] Wheel spins and lands on the winning category.
- [ ] **Host skip** during voting starts the leading category (never `mixed`).
- [ ] Zero-vote skip picks option 1.
- [ ] Override-vote gift lets the donor pick the category alone.

## 6. Gifts & power-ups

Trigger each from the debug panel, then confirm once with a real gift.

- [ ] Add time
- [ ] Remove a wrong answer (50/50 style)
- [ ] Fever mode
- [ ] 50/50 (dragon)
- [ ] Reroll question
- [ ] Sabotage blur
- [ ] Point steal
- [ ] Airhorn
- [ ] VIP sponsor
- [ ] Gift aliases resolve (crown → Little Crown, gamepad → Puppy Gamepad,
      universe → TikTok Universe)

## 7. Likes gates

- [ ] Gate triggers at the configured cadence (e.g. every 3 questions).
- [ ] Like/gift progress advances the gate bar.
- [ ] Completing the gate unlocks the next phase.
- [ ] Host "force complete" and "skip gate" work.
- [ ] Disabling likes gates removes the checkpoint.

## 8. Persistence

- [ ] Refresh mid-round resumes at the last checkpoint with scores intact.
- [ ] In-flight answers are cleared on resume; statuses reset to idle.
- [ ] All-time winners ("kings") persist across refresh.
- [ ] Top donators persist across refresh.
- [ ] Corrupt `localStorage` does not crash the app (loads empty).

## 9. Audio & TTS

- [ ] Questions are read aloud (if TTS enabled and key configured).
- [ ] Muting TTS stops speech immediately.
- [ ] Correct/wrong/timer/gong/win sounds fire at the right moments.
- [ ] Music beds start/stop on phase changes (no overlapping beds on idle).

## 10. Host tools

- [ ] Debug menu opens and follows the panel PIN/trust rules.
- [ ] Trust mode disables console gift spoofing.
- [ ] Hide-answers mode hides the correct answer from the host view.
- [ ] Manual adjustments (add winner/donator, edit score/goal) work.
- [ ] Emergency clear resets FX, timers and toasts.

## 11. Full-round smoke

- [ ] Play all 15 questions start to finish via voting + one mid-game category
      change (category gift).
- [ ] Game-over screen shows the podium and confetti correctly.
- [ ] Starting a new round resets scores, streaks and checkpoints.
- [ ] No console errors throughout the entire round.

---

## Optional automation probe

With trust mode **off**, the browser exposes `window.__gameProbe` (phase,
category, voting options, `skipTurn`, `castVote`, `runSkipTest`) for quick
scripted checks. It is intentionally removed when trust mode is enabled.

## If something fails

1. Note the exact phase, the raw chat message, and whether shuffle was on.
2. Check `src/hooks/usePlayers.js` (scoring) and
   `src/utils/ArabicUtils.js` (`resolveAnswerIndex` / `isPlayerAnswerCorrect`).
3. Add a regression case to `scripts/test-answer-matching.mjs`, fix, and re-run
   `npm test` before re-verifying.
