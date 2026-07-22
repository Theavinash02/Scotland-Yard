# PLAN.md — SHADOW LINE (working title)

Roadmap for turning this repo into a publishable, monetizable, cross-platform
hidden-movement game. Read together with `HANDOFF.md` (live status; what's done,
what's next, how to resume).

## Where the repo actually is today

The brief describes "vanilla JS + Firebase Auth + PeerJS". The repo has moved past
that description: it is a complete, well-tested game **without** Firebase:

- Full rules engine as pure functions (`engine.js`), bots in 3 difficulties
  (`bots.js`), SVG illustrated map renderer (`map.js`), hot-seat + solo + PeerJS
  online rooms with spectators/chat/resume (`ui.js`), settings/a11y/achievements
  (`enhancements.js`), tutorial, history/replay, PWA (manifest + service worker).
- Two CI-run test layers: a headless engine/bot simulator (`test/simulate.js`)
  and a Playwright UI suite (`test/ui/`).
- **No Firebase anywhere yet** — auth/sync is greenfield work, not a migration.

## Stack decision (justification, per the brief)

**Keep the current no-build vanilla-JS architecture for the game itself; add
tooling around it only where a phase needs it (Capacitor wraps a plain web dir
happily; a Vite build can be introduced at Phase 6 purely for
minification/bundling if wanted).**

Why not migrate to Vite + a framework now:

- The codebase is already cleanly modular (pure engine / bots / renderer / UI
  layers), works, and has CI. A framework rewrite of ~150KB of working,
  tested UI code adds weeks of risk and zero player-visible value.
- Every phase in this plan (rename, new map, ads, IAP, auth, Capacitor) is
  compatible with the current structure. Capacitor explicitly supports "point
  `webDir` at a folder of static files".
- The brief's real goals — original IP, one polished map, monetization, store
  builds — are content and integration work, not framework work.

If a bundler becomes necessary (e.g. AdMob/Billing Capacitor plugins need npm
imports), Phase 6 introduces Vite as a thin wrapper without rewriting app code.

## Legal/IP ground rules (apply to every phase)

- No "Scotland Yard", "Mr. X", "detectives" or Ravensburger terminology in any
  user-facing text, store listing, package ID, or repo-shipped asset.
- The official London board's station graph (currently `POS_RAW`/`EDG_RAW` in
  `engine.js`) **must be fully replaced** by an original map before any release.
  Mechanics (tickets, reveals, double moves) are not copyrightable and stay.
- Reference screenshots are style inspiration only — nothing is traced/copied.

### Naming scheme (placeholder until told otherwise)

| Old | New |
|---|---|
| Scotland Yard (game) | **SHADOW LINE** |
| Mr. X | **The Phantom** |
| Detectives | **Agents** (Agent 1–5) |
| Taxi / Bus / Underground / Ferry | Taxi / Bus / **Metro** / **River** |
| Black ticket | **Shadow ticket** (any transport, type concealed) |
| Double-move card | **Sprint** (two hops in one round) |
| London map | Original fictional city: **"Graywater"** (name shown on the board art) |

Internal identifiers (`mrx`, `dets`, ticket codes `t/b/u/x/f`, `sy_*` storage
keys) stay unchanged — they are invisible to players and renaming them would
churn every file and break saved games for no legal benefit.

## Phases

### Phase 0 — IP-safe rename (no stack change) — IN PROGRESS
Rename every user-facing string, title, manifest, README, tutorial, and test
comment to the SHADOW LINE scheme above. Repo stays fully playable; CI stays
green. (The board itself is still the placeholder graph until Phase 1 — noted
prominently in README as "not shippable yet".)

### Phase 1 — One original map + game feel
- Design an **original station graph** (~160–200 stations) for the fictional
  city: hand-shaped districts, a river with ferry line, metro trunk lines,
  bus arteries, taxi mesh. Built by a checked-in generator script
  (`tools/mapgen/`) whose output is baked into `engine.js` data + reviewed by
  simulation (balance sweeps with the existing `test/simulate.js`) and tuned
  until Phantom/Agent win rates are comparable to today's.
- Replace London landmark labels/art in `map.js` with original district names,
  parks, river, landmarks. Keep/extend the existing SVG renderer (it already
  does animation, pan/zoom, heatmaps) — no PixiJS needed unless perf demands it.
- Remove leftover placeholder/derivative art, videos, and screenshots.
- New board start positions, re-tuned bot heuristics if needed (they are
  graph-generic already).

### Phase 2 — Local multiplayer polish
Hot-seat pass-and-play already works; polish the handoff flow, per-seat naming,
and verify the tutorial/demo against the new map. (Mostly verification, small
fixes.)

### Phase 3 — Online multiplayer hardening
Keep PeerJS rooms; finish host-migration resilience, reconnect UX, and re-test
spectators/chat against the renamed game. Document the "host tab is the server"
limitation in-app.

### Phase 4 — Accounts + cross-device sync (Firebase)
- Add Firebase (Auth with Google sign-in + Firestore) as an **optional layer**:
  the game must keep working logged-out/offline.
- Sync profile (display name), game history, achievements, and the
  `entitlements.noAds` flag keyed to the account.
- Config in `firebase-config.js` with documented placeholder values.

### Phase 5 — Monetization
- Ad slots at natural breaks only (post-game debrief, lobby return): AdSense (or
  a web game ad network) on web, AdMob via Capacitor plugin on native.
- `ads.js` gate: every ad call checks the Firestore-backed (and locally cached)
  no-ads entitlement.
- Remove-ads IAP: Play Billing + StoreKit via Capacitor plugin; web purchase
  path (Stripe or Play web billing) stubbed behind the same entitlement.
- All IDs live in `monetization-config.js` with test/placeholder values.

### Phase 6 — PWA + Capacitor + store prep
- Audit PWA (manifest, icons, splash, offline) for the new brand.
- Add Capacitor project (`android/`, `ios/`) with package IDs like
  `com.<publisher>.shadowline`; wire AdMob/Billing plugins; optional Vite build
  step for a minified `webDir`.
- Original icon set, store screenshots, privacy policy stub,
  `STORE-CHECKLIST.md` (developer accounts, signing, listings, AdMob/AdSense,
  billing setup — everything the owner must do manually).

## Working agreement
Small verifiable commits, every commit green (`npm run test:all`), `HANDOFF.md`
updated with every commit, and a ready-to-paste "NEXT SESSION PROMPT" at the end
of each session.
