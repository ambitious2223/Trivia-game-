# Trivia Game — Interactive TikTok Live Trivia

A live, chat-driven trivia show for TikTok Live. Viewers answer by typing the
option number (1–4) or the answer text in chat, vote on the next category, send
gifts to trigger power-ups, and climb a 15-question difficulty ladder. The host
runs everything from one screen, with an optional debug panel and trust mode.

Built with **React + Vite** (front-end) and a small **Node/Express + Socket.IO
bridge** that relays TikTok Live chat, gifts and likes.

---

## Features

- **Chat-driven answers** — type the option number or the answer text. Arabic
  matching is tolerant of alif/hamza/teh-marbuta variants, tashkeel, punctuation
  and emoji (`src/utils/ArabicUtils.js`).
- **Category voting** — viewers pick the next category from 5 shuffled options;
  an animated wheel reveals the winner.
- **15-question ladder** — easy → medium → hard → crazy, classic flat scoring
  (50/100/200/200) with speed bonus, streak multiplier and fever mode.
- **Gift power-ups** — add time, remove a wrong answer, fever, 50/50, reroll,
  override vote, sabotage blur, point steal, airhorn and VIP sponsor.
- **Likes gates** — optional checkpoints that require a like/gift goal to unlock
  the next question or category vote.
- **Persistence** — all-time winners ("kings") and top donators, plus a live
  session checkpoint that survives a browser refresh.
- **Text-to-speech** — reads questions aloud (Azure voice optional).
- **~2,938 questions across 34 categories**, fully in Arabic.
- **Host tools** — debug menu, PIN/trust mode, hide-answers mode.

---

## Requirements

- **Node.js 20+** (CI uses Node 20)
- A TikTok Live account for real events, or use the debug panel to simulate
  viewers without going live.

---

## Quick start

```bash
npm install
npm run start:live    # starts the bridge (4480) + Vite dev server (4481)
```

Then open **http://localhost:4481**.

On Windows you can also double-click `TRIVIA.bat`, which installs dependencies
if needed and launches both processes.

### Running the pieces separately

```bash
npm run bridge   # Node bridge server (TikTok events) on port 4480
npm run dev      # Vite dev server on port 4481
```

---

## Configuration

Copy `.env.example` to `.env` (the app reads Vite-prefixed vars):

| Variable             | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `VITE_BRIDGE_URL`    | Bridge URL the UI connects to (default `http://localhost:4480`) |
| `VITE_AZURE_TTS_KEY` | Azure Speech key for text-to-speech (optional)      |
| `VITE_AZURE_REGION`  | Azure Speech region (e.g. `westeurope`)             |
| `BRIDGE_PORT`        | Bridge listen port (default `4480`)                 |

The bridge also accepts `TIKTOK_USERNAME`, `TIKFINITY_HOST` and `TIKFINITY_PORT`
as fallbacks. Live connection settings chosen in the UI are stored in
`.tiktok-config.json`.

> `.env` and `.tiktok-config.json` are git-ignored — never commit secrets.

### Connecting to TikTok

1. Start the bridge (`npm run bridge`).
2. In the app's debug/host panel, set the TikTok username and connect.
3. The bridge auto-detects: direct TikTok (`tiktok-live-connector`) or a local
   **TikFinity** instance, and streams `chat`, `gift` and `like` events.

---

## Game flow

```
voting → wheel → question → reveal → result → (likes gate) → next question → game over
```

Viewers answer during `question` (and the short `reveal` grace window before
scoring). The host can skip any phase from the debug panel.

---

## Scripts

| Script                        | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `npm run dev`                 | Vite dev server                                     |
| `npm run build`               | Production build to `dist/`                         |
| `npm run preview`             | Preview the production build                        |
| `npm run lint`                | ESLint (React + hooks + refresh)                    |
| `npm run bridge`              | Start the TikTok bridge server                      |
| `npm run start:live`          | Start bridge **and** Vite together                  |
| `npm test`                    | Full automated suite (all checks below)             |
| `npm run test:answers`        | Answer-matching / scoring regressions              |
| `npm run test:voting-skip`    | Category-voting skip regression                     |
| `npm run test:persistence`    | Winners / donators / session checkpoint             |
| `npm run test:trust`          | Host PIN, trust mode, gift auth token               |
| `npm run test:bridge`         | Bridge server tests                                 |
| `npm run verify:gifts`        | Gift alias / default power-up mapping               |
| `npm run validate:questions`  | Question-bank audit (thin categories, missing answers) |

All tests are plain Node scripts — no browser required.

---

## Project structure

```
server.js                     # Express + Socket.IO bridge (TikTok / TikFinity)
src/
  components/                 # UI: QuestionBoard, VotingScreen, Sidebar, DebugMenu, ...
  hooks/                      # Game logic: useGameState, usePlayers, useVotingSystem,
                              #   useTikTokGifts, useLikes, useGameTimers, useQuestionBank
  utils/                      # ArabicUtils, QuestionManager, giftsConfig, persistence,
                              #   TextToSpeech, Sounds, hostTrust
  questions/                  # 35 category source files (Arabic question bank)
  animations/ styles/ locales/
scripts/                      # Test + maintenance scripts
public/                       # Sounds, gift PNGs, images
```

`src/hooks/useGameState.js` is the orchestrator: it wires the modular hooks into
a single `gameState` object and exposes an `engineRef` bridge used by timers,
gifts and voting.

---

## Testing & CI

`npm test` runs the full suite locally. GitHub Actions
(`.github/workflows/ci.yml`) runs **lint → test → build** on every push and pull
request to `main`.

---

## License

Private project — all rights reserved.
