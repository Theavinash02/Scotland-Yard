# Scotland Yard — Night Chase Across London

A single-file, browser-playable adaptation of the board game **Scotland Yard**. One player is Mr. X, moving in secret across an authentic 199-station London map; up to five detectives try to run him down before the 24th round. Play solo against bots, hot-seat with friends on one device, or host/join an online room.

This is an original fan implementation — it uses the real published station/connection data and station numbering, but the map artwork, UI, and code are all original. It does not reproduce the official Ravensburger board art.

## Status

Core game loop, rules engine, bot AI, hot-seat and online multiplayer, animated movement, sound, and the illustrated map are all implemented and working. This is a solo side project built incrementally — see [Known limitations](#known-limitations) below for the rough edges.

## Running it

It's one HTML file with no build step and no dependencies.

- **Quickest:** open `scotland_yard.html` directly in a browser.
- **Recommended:** serve it over `http(s)://` (e.g. `npx serve .` or any static file server) rather than `file://`, since some browsers restrict Web Audio / clipboard APIs on `file://`.

Online rooms (see below) only work when the page is running inside an environment that exposes a `window.storage` key-value API (currently: the Claude.ai artifact viewer). Outside that environment the app detects this automatically and disables the "Create room" / "Join room" tabs, with a message explaining why — local hot-seat play and bots are unaffected.

## How to play

- **Setup:** the lobby lets you assign each of the 6 seats (Mr. X + up to 5 detectives) to a human or a bot (easy/hard), or leave detective seats empty.
- **Mr. X** moves first each round, in secret — only the ticket type he plays (taxi/bus/underground/black) is shown to detectives. He must surface and reveal his true station on rounds **3, 8, 13, 18, and 24**.
- **Detectives** move in turn order after Mr. X, always in the open, spending real tickets (10 taxi / 8 bus / 4 underground each, standard allocation). Two detectives can't share a station.
- **Win conditions:** detectives win instantly if one lands on Mr. X's station, or if Mr. X ever has no legal move. Mr. X wins if the round log fills to 24 without being caught, or if every detective is stuck.
- **Black tickets** let Mr. X take any transport (including the Thames ferry between Greenwich and Whitehall) without revealing which one. **Double-move** cards let him take two hops in one round.
- Tap/click a highlighted station to move; if it's reachable by more than one ticket type, a small chooser pops up. Drag to pan, scroll/pinch to zoom.
- A "show possible Mr. X spots" toggle lets you see the live deduced location set (same logic the hard detective bots use).

## Bots

- **Easy:** picks a random legal move (Mr. X avoids spending black tickets unless forced).
- **Hard:**
  - *Detectives* track Mr. X's possible-location set from ticket types and reveal rounds, then move to minimize distance to that set while spreading out across high-connectivity junctions.
  - *Mr. X* maximizes distance to the nearest detective, avoids dead ends, prefers black tickets right after a reveal or when a move is ferry-only, and plays a double-move when a detective gets adjacent.

## Multiplayer

- **Hot-seat:** multiple humans on one device. If any human plays a detective while a human also plays Mr. X, the app blanks Mr. X's position between turns and prompts a "pass the device" handoff so detectives can't see it.
- **Online rooms:** the host creates a 5-letter room code; room state (seats, then game state) lives in shared key-value storage and clients poll it every ~2s. Any seat left "open" when the host starts becomes a hard bot. This is simple last-write-wins sync, not a real-time authoritative server — see limitations.

## Map data

Station positions and the 467 taxi/bus/underground/ferry connections come from a published open-source dataset matching the official station numbering (1–199). The map artwork itself — the illustrated parchment background, districts, parks, the Thames, station badges, and route styling — is original, built as an SVG rendered from that coordinate/connection data at runtime (see `buildMap()` in the script).

## Tech notes

- Plain HTML/CSS/JS, no framework, no build step, no external JS dependencies. Google Fonts (Jost, IBM Plex Mono, Marcellus) are the only external requests besides the online-room storage calls.
- Map and pieces are rendered as SVG; pan/zoom is done by mutating `viewBox`, with pointer events used for both drag-panning and tap-to-select (so panning and tapping a station don't conflict).
- Sound effects are synthesized at runtime with the Web Audio API — no audio files.
- Rules engine (`newGame`, `applyMrx`, `applyDet`, `possibleSet`, bot pickers) is written as pure functions over a plain game-state object, independent of the DOM/rendering code, which is what made it possible to headlessly simulate hundreds of full games for testing.

## Known limitations

- **Online rooms depend on the host app's shared storage.** Outside an environment that provides `window.storage`, online play is unavailable (the UI explains this and falls back to local/bot play). There's no dedicated backend/WebSocket server.
- **Online sync is polling-based (~2s), not push/real-time**, and uses last-write-wins — concurrent writes from two clients in the same instant could clobber each other. Fine for turn-based play among a few friends; not built for anything adversarial.
- **Anyone with the room code can read/write that room's shared storage entry**, including a human Mr. X's hidden position — there's no server-side authority hiding it. Treat online rooms as "good enough for friends," not cheat-proof.
- **Mr. X's non-black ticket supply is treated as unlimited** in this digital version, rather than being recycled from tickets detectives spend (the tabletop mechanic). In practice the physical version almost never runs Mr. X out of taxi/bus/underground tickets either, so this shouldn't change how a game plays out, but it's a deliberate simplification worth knowing about.
- No persistence/resume: refreshing the page loses an in-progress game (local or online).
- No spectator mode, no replay/export of a finished game beyond the on-screen route summary shown at game end.
- Not tested for accessibility (screen readers, keyboard-only play) — pointer/touch only.

## Testing so far

The rules engine has been exercised with headless bot-vs-bot simulations (hundreds of full games across bot difficulty/detective-count combinations) checking win conditions, ticket accounting, no-shared-stations, and that the detectives' deduced possible-location set always contains Mr. X's true station. UI-level checks (tap-to-move, element visibility, map structure) have been run via jsdom smoke tests. None of this is a substitute for real playtesting — bug reports welcome.
