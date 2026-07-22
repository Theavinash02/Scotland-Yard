# HANDOFF.md — live project status

Companion to `PLAN.md` (the phased roadmap). This file is updated after every
commit so any session/model can resume with zero context loss.

_Last updated: 2026-07-22, branch `claude/work-hhvy7e`._

## What's done

- **PLAN.md** — full phased roadmap (Phase 0 rename → Phase 6 store prep), with
  the stack decision: **keep the no-build vanilla-JS architecture**, add
  tooling per phase (Capacitor/Vite only when Phase 6 needs them).
- **Phase 0 — IP-safe rename: DONE.** All user-facing text renamed:
  Scotland Yard → **SHADOW LINE**, Mr. X → **the Phantom**, detectives →
  **Agents**, Underground → **Metro**, black ticket → **shadow ticket**,
  double move → **sprint**, London → **Graywater** (title, manifest, README,
  lobby/rules/tutorial/achievements, board's carto + river labels).
  Internal identifiers (`mrx`, `dets`, tk codes `t/b/u/x/f`, `sy_*` storage
  keys, `thamesPath` id) intentionally unchanged — invisible to players,
  keeps saves/engine API stable.
- **@playwright/test bumped 1.48 → 1.56** (matches current Chromium; CI
  downloads its own browsers so CI is unaffected).

## Verified

- `npm run test:sim` — 4000 games, all invariants held.
- `npm run test:ui` — 24/24 pass (desktop + mobile-landscape).

## What's NOT done yet (in phase order — see PLAN.md for detail)

1. **Phase 1 (next): original map.** `POS_RAW`/`EDG_RAW` in `engine.js` are
   still the official board's station graph — the single remaining IP blocker.
   Build `tools/mapgen/` to generate an original ~160–200-station Graywater
   graph (river + ferry, metro trunks, bus arteries, taxi mesh), bake it into
   `engine.js`, update `MRX_STARTS`/`DET_STARTS`, rebalance with
   `node test/simulate.js --balance 3000`, and redo `map.js` landmark/district
   labels. Also replace/remove: `video/*.mp4` (old-brand intro & how-to
   videos — `intro.js` degrades gracefully if they're missing), `screenshots/*`
   (old-brand README images), `icons/*` (old logo), and hardcoded reveal-round
   copy ("3, 8, 13, 18 and 24") if the schedule changes.
2. Phase 2 — hot-seat polish (mostly verification).
3. Phase 3 — PeerJS hardening (host migration/reconnect UX).
4. Phase 4 — Firebase Auth (Google) + Firestore sync (greenfield — **no
   Firebase exists in the repo**, despite the original brief saying so).
5. Phase 5 — ads (AdSense web / AdMob native) + remove-ads IAP + entitlement.
6. Phase 6 — PWA audit, Capacitor Android/iOS, STORE-CHECKLIST.md.

## Key files / decisions

- `engine.js` — pure rules engine + **the placeholder station graph to replace**.
- `bots.js` — graph-generic bot AI (should survive the map swap unchanged).
- `map.js` — SVG board renderer; landmark labels/districts are Phase 1 work.
- `ui.js` — app state, lobby, hot-seat, PeerJS rooms, boot.
- `enhancements.js` — settings/a11y/hints/achievements; `TK_ICON`/`TK_WORD`
  ticket naming lives here and in `engine.js` (`TK_NAME`) + `ui.js`
  (`MOVE_TK_NAME`).
- Naming scheme table: see PLAN.md ("Legal/IP ground rules").
- Tests: `npm run test:all` (sim + Playwright). Every commit must stay green.

## How to run

- Serve statically (`npx serve .`) and open `index.html`; no build step.
- Tests: `npm install`, then `npm run test:all`. If Playwright can't find a
  browser locally: `npx playwright install chromium`.

## Config/secrets the owner still needs to supply (future phases)

- Firebase project config (Phase 4), AdSense/AdMob IDs (Phase 5),
  Play/App Store accounts + signing keys (Phase 6). Placeholders will live in
  documented config files when those phases land.

## NEXT SESSION PROMPT (paste to resume)

> Read `PLAN.md` and `HANDOFF.md` in the repo root. Phase 0 (IP-safe rename)
> is complete and green. Start **Phase 1: the original Graywater map** —
> replace `POS_RAW`/`EDG_RAW`/`MRX_STARTS`/`DET_STARTS` in `engine.js` with an
> original station graph produced by a new checked-in generator
> (`tools/mapgen/`), rebalance using `node test/simulate.js --balance 3000`
> until win rates are close to the current README numbers, then update
> `map.js` district/landmark labels and remove old-brand media
> (`video/`, `screenshots/`, `icons/`). Work in small commits, keep
> `npm run test:all` green, and update `HANDOFF.md` after every commit.
