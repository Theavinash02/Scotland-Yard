# MAP-REWORK-PLAN.md — the illustrated Graywater map

A visual-only rework of the board rendering, matching the layered, "real city
at night" richness of the reference (`screenshots/image-1784704395939.webp`)
with fully original art. **No game logic changes**: the Phase 1 station graph
(`POS_RAW`/`EDG_RAW`, ids, coordinates, adjacency, transport types) and all of
Phase 4 (auth/sync) are untouched — every art layer is *derived from* the
existing node coordinates.

## Current state (what renders the map today)

- `map.js buildMap()` builds one SVG: defs → paper/grain background rects →
  `#L-detail` (procedural street grid, hidden except in some modes) → `.map-deco`
  (district tint ellipses, 3 parks, district labels) → `.map-river` (banks +
  fill + label + bridges, path derived from the ferry edges) → frame/compass/
  cartouche → functional layers `#L-edges/ps/hl/stations` → `#L-pieces/fx`.
- Pan/zoom mutates the viewBox (`initPanZoom`), pieces/vehicles animate in
  `#L-fx`. All of that is good and **stays**.
- Six selectable "board modes" (night/day/aerial/atlas/tabletop/blueprint) are
  CSS class overlays (~80 rules in `styles.css`) over the same parchment base.
  None reaches the reference's quality; they dilute the art budget.

## Decision: one style, done well

Replace the six modes with a single illustrated **Graywater night** style
(dark, noir, cinematic — the game's identity). The Settings board picker goes
away (`SETTINGS.board` stays in storage, ignored, so saved settings don't
break); high-contrast, reduce-motion, and theme settings keep working.

## New architecture

**New file `mapart.js`** — `buildGraywaterBase(svg)` generates the static base
art as SVG groups, deterministically (seeded PRNG, fixed seed), from
`POS`/`PAIRS`/`NBRS`. Inserted once by `buildMap()` below the functional
layers; never touched again (only tokens/highlights redraw). Element budget
≤ ~1300 simple shapes, two cheap filters max, no per-frame work — pan/zoom
stays a single viewBox write. If low-end mobile jank ever shows up, the base
group can later be rasterized to one `<image>` without changing its API.

Layers, bottom → top (all derived from station coordinates):

1. **Water** — polygon band widened around the ferry-edge chain (the same
   derivation the river already uses) plus an irregular harbor bulge at the
   downstream end; deep teal fill, soft glowing shoreline, sparse ripple
   strokes, dashed shipping-lane along the ferry line.
2. **Land** — dark slate landmass (viewport-filling rect minus nothing; the
   water sits on top), broken up with large soft noise blobs so it isn't flat.
3. **Districts** — stations k-means-clustered around the six existing district
   label anchors; each cluster's expanded convex hull becomes a softly tinted,
   soft-edged region. Existing names kept (HOLLOWBROOK, NORTHGATE, THE
   EXCHANGE, OLD QUAY, LANTERN ROW, IRONVALE) in letter-spaced small caps,
   masked into the map (low opacity, under the network).
4. **Parks** — 4–5 dark-green organic polygons placed in the largest gaps
   between stations (computed, not hardcoded), with tree stipples and small
   boxed labels like the reference.
5. **Street network** (the key layer) — (a) every transport edge gets a dark
   asphalt road casing under it, so the colored routes read as riding real
   streets; (b) a filler mesh of minor streets: short seeded segments joining
   near-neighbor midpoints and jittered offsets, thin and low-opacity,
   denser near high-degree stations; a few brighter arterials.
6. **City blocks** — small seeded building-footprint rects scattered across
   land, skipped within a corridor of any road/route/water/station, warm
   window-lit speckle near the center, sparser at the edges.
7. **Landmarks** — original stylized icons + boxed labels: Graywater Bridge
   (on the river at a road crossing), The Beacon (harbor light), Grand
   Terminal (at the highest-degree metro station), Old Market Hall, plus the
   existing cartouche/compass restyled to match.

Game layer (refined in `map.js`, same DOM contract):

8. **Routes** — keep taxi gold / bus green / metro red / ferry cyan; thinner
   halos, glow reserved for metro + selection states so geography shows
   through.
9. **Stations** — ring-pin badges with the number inside (ring color = best
   transport: metro red > bus green > taxi gold; ferry stations get a cyan
   pip), soft drop shadow; existing hover/reachable/selected affordances keep
   working via `#L-hl` + CSS.
10. **Tokens/possible-spots** — keep the pieces and belief heatmap; restyle the
    heatmap as a softer map-glow.
11. **Mood** — gentle vignette + faint film grain (one tiled pattern, low
    opacity).

## Files that change

- `mapart.js` (new) — all static base art generation.
- `map.js` — buildMap() slims to defs + `buildGraywaterBase()` + functional
  layers; new station markers; edge casing/glow rebalance. Pan/zoom, tap
  handling, vehicles, focus animation unchanged.
- `styles.css` — remove the ~80 board-mode override rules; add the new
  single-style rules.
- `enhancements.js` — remove the board-mode picker row from Settings (nothing
  else).
- `index.html` / `sw.js` — one script tag + cache list/version.
- Screenshots + README regenerated at the end.

## Verification per commit

`node test/simulate.js` (logic untouched — must stay green), `npx playwright
test` (30 specs; none reference board modes), plus a headless screenshot after
each visual step to eyeball progress. Final pass re-runs the Phase 4 cloud
specs and the hot-seat/game flows to confirm nothing regressed.

## Commit sequence

1. `docs: MAP-REWORK-PLAN.md` (this file)
2. `feat(map): land + Graywater water/harbor generated from the ferry line`
3. `feat(map): district regions, parks, and integrated labels`
4. `feat(map): street mesh + road casings under every transport route`
5. `feat(map): city blocks, landmarks, vignette/grain`
6. `feat(map): station ring-pins + route glow rebalance + heatmap restyle`
7. `chore(map): remove board-mode system; regenerate screenshots; docs`
