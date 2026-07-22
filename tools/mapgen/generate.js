#!/usr/bin/env node
/* Graywater map generator.
 *
 * Produces the game's original 199-station board: station positions, the
 * taxi/bus/metro street network, a river with a ferry line, and the start
 * lists — then (with --write) bakes them into engine.js, replacing the
 * POS_RAW / EDG_RAW / MRX_STARTS / DET_STARTS constants in place.
 *
 * Fully deterministic: change SEED (or the tuning constants below) to get a
 * different city, re-run `node tools/mapgen/generate.js --write`, then re-run
 * `node test/simulate.js` to confirm invariants and balance.
 *
 * Design intent (mirrors what makes the classic hidden-movement boards work):
 *  - taxi at every station, short planar hops (the walkable street mesh);
 *  - buses on a sparser hub network with mid-range jumps;
 *  - a few long metro trunks between major interchanges;
 *  - a meandering river that the street mesh only crosses at a handful of
 *    bridges, plus a ferry line along it that only the Phantom can ride.
 */
'use strict';

const SEED = 20260722;
const N = 199;               // station count (engine hardcodes 1..199 loops)
const W = 1000, H = 761;     // board coordinate space (matches map.js viewBox)
const MARGIN = 30;
const COLS = 17, ROWS = 12;  // jittered placement grid (204 cells, 5 dropped)
const TAXI_MAX_LEN = 98;     // max taxi hop length
const TAXI_DEG_CAP = 4;
const TAXI_BRIDGES = 8;      // taxi edges allowed to cross the river
const BUS_COUNT = 46;        // stations with bus service
const BUS_MIN = 85, BUS_MAX = 270;
const BUS_DEG_CAP = 4;
const BUS_BRIDGES = 5;
const METRO_COUNT = 15;      // metro interchanges (subset of bus stations)
const METRO_EXTRA = 3;       // loop-making edges beyond the spanning tree
const FERRY_STOPS = 5;
const MRX_START_N = 13, DET_START_N = 18;

// mulberry32 PRNG
let _s = SEED >>> 0;
function rnd() {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ---------------- geometry helpers ---------------- */
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function orient(p, q, r) { return Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)); }
function segCross(a, b, c, d) { // proper intersection, shared endpoints excluded
  if (a === c || a === d || b === c || b === d) return false;
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
}

/* ---------------- the river ---------------- */
// A designed meander, west to east through the lower-middle of the board.
function riverY(x) {
  return 480 + 78 * Math.sin((x - 120) / 275) + 34 * Math.sin(x / 93 + 1.6);
}
const RIVER = [];
for (let x = -40; x <= W + 40; x += 26) RIVER.push({ x, y: riverY(x) });
function crossesRiver(a, b) {
  for (let i = 0; i < RIVER.length - 1; i++) {
    const c = RIVER[i], d = RIVER[i + 1];
    const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
  }
  return false;
}

/* ---------------- station placement ---------------- */
function placeStations() {
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ r, c });
  // drop cells until COLS*ROWS - N remain removed
  for (let k = cells.length - N; k > 0; k--) cells.splice(Math.floor(rnd() * cells.length), 1);
  const cw = (W - 2 * MARGIN) / COLS, ch = (H - 2 * MARGIN) / ROWS;
  const pts = cells.map(({ r, c }) => {
    let x = MARGIN + (c + 0.5 + (rnd() - 0.5) * 0.82) * cw;
    let y = MARGIN + (r + 0.5 + (rnd() - 0.5) * 0.82) * ch;
    // nudge stations off the river itself so nodes never sit in the water
    const ry = riverY(x);
    if (Math.abs(y - ry) < 26) y = ry + (y >= ry ? 26 : -26) + (rnd() - 0.5) * 6;
    return { x: Math.min(W - MARGIN, Math.max(MARGIN, x)), y: Math.min(H - MARGIN, Math.max(MARGIN, y)) };
  });
  // number top-left -> bottom-right in horizontal bands, like a printed board
  pts.sort((a, b) => (Math.floor(a.y / (ch * 0.9)) - Math.floor(b.y / (ch * 0.9))) || (a.x - b.x));
  return pts; // index i => station id i+1
}

/* ---------------- edge building ---------------- */
function buildTaxi(P) {
  const cand = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const d = dist(P[i], P[j]);
    if (d <= TAXI_MAX_LEN && d >= 26) cand.push({ i, j, d });
  }
  cand.sort((a, b) => a.d - b.d);
  const deg = new Array(N).fill(0), edges = [];
  let bridges = 0;
  const crossesAny = (i, j) => edges.some(e => segCross(P[i], P[j], P[e.i], P[e.j]));
  for (const e of cand) {
    if (deg[e.i] >= TAXI_DEG_CAP || deg[e.j] >= TAXI_DEG_CAP) continue;
    const wet = crossesRiver(P[e.i], P[e.j]);
    if (wet && bridges >= TAXI_BRIDGES) continue;
    if (crossesAny(e.i, e.j)) continue;
    edges.push(e); deg[e.i]++; deg[e.j]++;
    if (wet) bridges++;
  }
  // connectivity: union-find, then join components with the shortest legal link
  const uf = new Array(N).fill(0).map((_, i) => i);
  const find = x => (uf[x] === x ? x : (uf[x] = find(uf[x])));
  edges.forEach(e => { uf[find(e.i)] = find(e.j); });
  for (;;) {
    const comp = {};
    for (let i = 0; i < N; i++) (comp[find(i)] = comp[find(i)] || []).push(i);
    const keys = Object.keys(comp);
    if (keys.length === 1) break;
    // link the two closest stations in different components (crossing rules relaxed)
    let best = null;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      if (find(i) === find(j)) continue;
      const d = dist(P[i], P[j]);
      if (!best || d < best.d) best = { i, j, d };
    }
    edges.push(best); deg[best.i]++; deg[best.j]++;
    uf[find(best.i)] = find(best.j);
  }
  // no dead ends: give every degree-1 station a second nearby link
  for (let i = 0; i < N; i++) {
    if (deg[i] > 1) continue;
    let best = null;
    for (let j = 0; j < N; j++) {
      if (j === i || edges.some(e => (e.i === i && e.j === j) || (e.i === j && e.j === i))) continue;
      if (deg[j] >= TAXI_DEG_CAP + 1) continue;
      const d = dist(P[i], P[j]);
      if (d > TAXI_MAX_LEN * 1.45) continue;
      if (crossesRiver(P[i], P[j])) continue;
      if (crossesAny(i, j)) continue;
      if (!best || d < best.d) best = { i, j: j, d };
    }
    if (best) { edges.push({ i, j: best.j, d: best.d }); deg[i]++; deg[best.j]++; }
  }
  return edges;
}

// spread-out subset selection: greedy farthest-point sampling, seeded on a hub
function farthestSample(P, ids, count, degBias) {
  const chosen = [ids.reduce((a, b) => (degBias[b] > degBias[a] ? b : a))];
  while (chosen.length < count) {
    let best = -1, bestScore = -1;
    for (const c of ids) {
      if (chosen.includes(c)) continue;
      const dmin = Math.min(...chosen.map(s => dist(P[c], P[s])));
      const score = dmin * (1 + 0.06 * degBias[c]);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    chosen.push(best);
  }
  return chosen;
}

function buildOverlay(P, stations, minL, maxL, degCap, bridgeMax, wantPerNode) {
  const edges = []; const deg = {}; stations.forEach(s => { deg[s] = 0; });
  let bridges = 0;
  const cand = [];
  for (let a = 0; a < stations.length; a++) for (let b = a + 1; b < stations.length; b++) {
    const i = stations[a], j = stations[b], d = dist(P[i], P[j]);
    if (d >= minL && d <= maxL) cand.push({ i, j, d });
  }
  cand.sort((a, b) => a.d - b.d);
  for (const e of cand) {
    if (deg[e.i] >= degCap || deg[e.j] >= degCap) continue;
    if (deg[e.i] >= wantPerNode && deg[e.j] >= wantPerNode) continue;
    const wet = crossesRiver(P[e.i], P[e.j]);
    if (wet && bridges >= bridgeMax) continue;
    if (edges.some(x => segCross(P[e.i], P[e.j], P[x.i], P[x.j]))) continue;
    edges.push(e); deg[e.i]++; deg[e.j]++;
    if (wet) bridges++;
  }
  // connect the overlay so its network is useful end to end
  const uf = {}; stations.forEach(s => { uf[s] = s; });
  const find = x => (uf[x] === x ? x : (uf[x] = find(uf[x])));
  edges.forEach(e => { uf[find(e.i)] = find(e.j); });
  for (;;) {
    const comps = {};
    stations.forEach(s => { (comps[find(s)] = comps[find(s)] || []).push(s); });
    if (Object.keys(comps).length === 1) break;
    let best = null;
    for (const i of stations) for (const j of stations) {
      if (i >= j || find(i) === find(j)) continue;
      const d = dist(P[i], P[j]);
      if (!best || d < best.d) best = { i, j, d };
    }
    edges.push(best); uf[find(best.i)] = find(best.j);
  }
  return edges;
}

function buildMetro(P, stations) {
  // spanning tree over the interchanges = trunk lines; a few extras = loops
  const edges = [], inTree = [stations[0]];
  const rest = stations.slice(1);
  while (rest.length) {
    let best = null;
    for (const t of inTree) for (const r of rest) {
      const d = dist(P[t], P[r]);
      if (!best || d < best.d) best = { i: t, j: r, d };
    }
    edges.push(best); inTree.push(best.j); rest.splice(rest.indexOf(best.j), 1);
  }
  const deg = {}; stations.forEach(s => { deg[s] = 0; });
  edges.forEach(e => { deg[e.i]++; deg[e.j]++; });
  const cand = [];
  for (let a = 0; a < stations.length; a++) for (let b = a + 1; b < stations.length; b++) {
    const i = stations[a], j = stations[b], d = dist(P[i], P[j]);
    if (d > 140 && d < 430 && !edges.some(e => (e.i === i && e.j === j) || (e.i === j && e.j === i))) cand.push({ i, j, d });
  }
  cand.sort((a, b) => a.d - b.d);
  for (const e of cand) {
    if (edges.length >= stations.length - 1 + METRO_EXTRA) break;
    if (deg[e.i] >= 3 || deg[e.j] >= 3) continue;
    edges.push(e); deg[e.i]++; deg[e.j]++;
  }
  return edges;
}

function buildFerry(P) {
  // pick stations hugging the river, spread west->east, and chain them
  const targets = [];
  for (let k = 0; k < FERRY_STOPS; k++) targets.push(90 + (k + 0.5) * ((W - 180) / FERRY_STOPS));
  const stops = [];
  targets.forEach(tx => {
    let best = -1, bestScore = 1e9;
    for (let i = 0; i < N; i++) {
      if (stops.includes(i)) continue;
      const score = Math.abs(P[i].x - tx) * 0.7 + Math.abs(P[i].y - riverY(P[i].x)) * 2.2;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    stops.push(best);
  });
  const uniq = [...new Set(stops)];
  uniq.sort((a, b) => P[a].x - P[b].x);
  const edges = [];
  for (let k = 0; k < uniq.length - 1; k++) edges.push({ i: uniq[k], j: uniq[k + 1] });
  return { stops: uniq, edges };
}

/* ---------------- assembly ---------------- */
function generate() {
  const P = placeStations();
  const taxi = buildTaxi(P);
  const tDeg = new Array(N).fill(0);
  taxi.forEach(e => { tDeg[e.i]++; tDeg[e.j]++; });
  const allIds = Array.from({ length: N }, (_, i) => i);
  const busStations = farthestSample(P, allIds, BUS_COUNT, tDeg);
  const bus = buildOverlay(P, busStations, BUS_MIN, BUS_MAX, BUS_DEG_CAP, BUS_BRIDGES, 2);
  const metroStations = farthestSample(P, busStations, METRO_COUNT, tDeg);
  const metro = buildMetro(P, metroStations);
  const ferry = buildFerry(P);

  // start lists: spread, well-connected, non-overlapping
  const good = allIds.filter(i => tDeg[i] >= 3);
  const mrx = farthestSample(P, good, MRX_START_N, tDeg);
  const detPool = good.filter(i => !mrx.includes(i));
  const det = farthestSample(P, detPool, DET_START_N, tDeg);

  const fmt = v => (Math.round(v * 10) / 10).toFixed(1);
  const posRaw = P.map((p, i) => (i + 1) + ':' + fmt(p.x) + ',' + fmt(p.y)).join(';');
  const edgeStr = (list, t) => list.map(e => {
    const a = Math.min(e.i, e.j) + 1, b = Math.max(e.i, e.j) + 1;
    return a + '-' + b + '-' + t;
  });
  // ordered t, b, u, f like the classic data layout
  const edgRaw = [].concat(edgeStr(taxi, 't'), edgeStr(bus, 'b'), edgeStr(metro, 'u'), edgeStr(ferry.edges, 'f')).join(';');
  return {
    posRaw, edgRaw,
    mrxStarts: mrx.map(i => i + 1).sort((a, b) => a - b),
    detStarts: det.map(i => i + 1).sort((a, b) => a - b),
    stats: {
      taxi: taxi.length, bus: bus.length, metro: metro.length, ferry: ferry.edges.length,
      total: taxi.length + bus.length + metro.length + ferry.edges.length,
      busStations: busStations.length, metroStations: metroStations.length,
      ferryStops: ferry.stops.map(i => i + 1)
    }
  };
}

/* ---------------- verification (mirrors engine invariants) ---------------- */
function verify(g) {
  const nbrs = {}; for (let i = 1; i <= N; i++) nbrs[i] = [];
  g.edgRaw.split(';').forEach(s => {
    const [a, b, t] = s.split('-');
    nbrs[+a].push({ to: +b, t }); nbrs[+b].push({ to: +a, t });
  });
  for (let i = 1; i <= N; i++) {
    if (!nbrs[i].some(e => e.t === 't')) throw new Error('station ' + i + ' has no taxi link');
  }
  // connected without ferry
  const seen = new Set([1]), q = [1];
  while (q.length) {
    const v = q.pop();
    nbrs[v].forEach(e => { if (e.t !== 'f' && !seen.has(e.to)) { seen.add(e.to); q.push(e.to); } });
  }
  if (seen.size !== N) throw new Error('graph not connected without ferry: ' + seen.size + '/' + N);
  const dup = new Set();
  g.edgRaw.split(';').forEach(s => {
    if (dup.has(s)) throw new Error('duplicate edge ' + s);
    dup.add(s);
  });
}

/* ---------------- bake into engine.js ---------------- */
function write(g) {
  const fs = require('fs'), path = require('path');
  const file = path.join(__dirname, '..', '..', 'engine.js');
  let src = fs.readFileSync(file, 'utf8');
  const rep = (re, val, name) => {
    if (!re.test(src)) throw new Error('could not find ' + name + ' in engine.js');
    src = src.replace(re, val);
  };
  rep(/const POS_RAW="[^"]*";/, 'const POS_RAW="' + g.posRaw + '";', 'POS_RAW');
  rep(/const EDG_RAW="[^"]*";/, 'const EDG_RAW="' + g.edgRaw + '";', 'EDG_RAW');
  rep(/const MRX_STARTS=\[[^\]]*\];/, 'const MRX_STARTS=[' + g.mrxStarts.join(',') + '];', 'MRX_STARTS');
  rep(/const DET_STARTS=\[[^\]]*\];/, 'const DET_STARTS=[' + g.detStarts.join(',') + '];', 'DET_STARTS');
  fs.writeFileSync(file, src);
  console.log('engine.js updated.');
}

const g = generate();
verify(g);
console.log('Graywater map generated:', JSON.stringify(g.stats, null, 2));
console.log('Phantom starts:', g.mrxStarts.join(', '));
console.log('Agent starts:  ', g.detStarts.join(', '));
if (process.argv.includes('--write')) write(g);
else console.log('(dry run — pass --write to bake into engine.js)');
