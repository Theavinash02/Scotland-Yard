#!/usr/bin/env node
/* New York map generator (see GRAPH-DESIGN.md).
 *
 * Generates the 199-station "Shadow Line: New York" board: a stylized
 * Manhattan laid horizontally across the canvas with the Hudson along the top
 * (Jersey pocket beyond it) and the East River along the bottom (Brooklyn and
 * Williamsburg/Queens pockets beyond it). Taxi is a dense grid mesh that never
 * crosses water; bus runs avenue-aligned; metro is sparse trunk lines that may
 * tunnel under rivers; ferries are the only other water crossings. East River
 * carries three road bridges; the Hudson has none (tunnel + ferry only).
 *
 * Deterministic (fixed seed). `--write` bakes the result into mapdata-ny.js
 * (MAPS.newyork + DEFAULT_MAP='newyork'), which the app and simulator load
 * after mapdata.js. Re-run `node test/simulate.js --map=newyork` after any
 * change here.
 */
'use strict';
const SEED = 10011;
const W = 1000, H = 761, N = 199;

// tuning levers (see GRAPH-DESIGN.md "levers")
const TAXI_MAX = 68, TAXI_CAP = 4;
const BUS_COUNT = 46, BUS_MIN = 80, BUS_MAX = 250, BUS_CAP = 4;
const METRO_COUNT = 15, METRO_EXTRA = 3;
const DET_TICKETS = { t: 10, b: 8, u: 3 };

let _s = SEED >>> 0;
function rnd() {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ---------------- geography frame ----------------
 * (u,v): u in [0,1] runs along Manhattan's spine (downtown left -> uptown
 * right); v in px across it (+v = toward the top of the canvas / the Hudson).
 */
const A = { x: 45, y: 505 }, B = { x: 968, y: 208 };
const AXIS = { dx: B.x - A.x, dy: B.y - A.y };
const AXLEN = Math.hypot(AXIS.dx, AXIS.dy);
const UN = { x: AXIS.dx / AXLEN, y: AXIS.dy / AXLEN };          // along
const VN = { x: UN.y, y: -UN.x };                                // across (+v = up-left of axis = top)
function uv(u, v) { return { x: A.x + AXIS.dx * u + VN.x * v, y: A.y + AXIS.dy * u + VN.y * v }; }

const MAN_W = 138;            // Manhattan half-width
const RIVER_W = 52;           // river band width
const HUD_C = MAN_W + 14 + RIVER_W / 2;   // Hudson centerline v
const EAST_C = -(MAN_W + 14 + RIVER_W / 2); // East River centerline v
const PARK = { u0: 0.615, u1: 0.775, v0: -50, v1: 52 };          // Central Park
function inPark(u, v, pad) {
  pad = pad || 0;
  return u > PARK.u0 - pad && u < PARK.u1 + pad && v > PARK.v0 - pad * 300 && v < PARK.v1 + pad * 300;
}
// river v-band at a given u (slight meander so shores aren't ruler-straight)
function riverBand(center, u) {
  const m = Math.sin(u * 9.2 + (center > 0 ? 0.7 : 2.3)) * 7;
  return { lo: center + m - RIVER_W / 2, hi: center + m + RIVER_W / 2 };
}
function inWater(u, v) {
  if (u < -0.06 || u > 1.06) return false;
  const h = riverBand(HUD_C, u), e = riverBand(EAST_C, u);
  return (v > h.lo && v < h.hi) || (v > e.lo && v < e.hi);
}
// East River road-bridge corridors (u positions); Hudson has none
const BRIDGES_U = [0.15, 0.42, 0.68];

/* ---------------- station placement ---------------- */
function place() {
  const pts = [];
  const put = (u, v, region) => {
    const p = uv(u, v);
    if (p.x < 26 || p.x > W - 26 || p.y < 26 || p.y > H - 26) return;
    pts.push({ u, v, x: p.x, y: p.y, region });
  };
  // Manhattan: jittered grid, avenues along u
  const DU = 0.0455, DV = 45;
  for (let gu = 0.022; gu <= 1.0; gu += DU) {
    for (let gv = -MAN_W + 22; gv <= MAN_W - 12; gv += DV) {
      const u = gu + (rnd() - 0.5) * DU * 0.55, v = gv + (rnd() - 0.5) * DV * 0.55;
      if (Math.abs(v) > MAN_W - 8) continue;
      if (inPark(u, v, 0.008)) continue;
      if (inWater(u, v)) continue;
      put(u, v, 'manhattan');
    }
  }
  // pockets: [uMin,uMax, vStart(beyond river), rows, cols, region]
  const pockets = [
    [0.02, 0.32, HUD_C + RIVER_W / 2 + 26, 2, 7, 'jersey'],
    [0.03, 0.46, EAST_C - RIVER_W / 2 - 26, 3, 8, 'brooklyn'],
    [0.55, 0.94, EAST_C - RIVER_W / 2 - 26, 2, 8, 'queens'],
  ];
  pockets.forEach(([u0, u1, vs, rows, cols, region]) => {
    const sgn = vs > 0 ? 1 : -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = u0 + (u1 - u0) * (c + 0.5) / cols + (rnd() - 0.5) * 0.02;
        const v = vs + sgn * (r * 46 + (rnd() - 0.5) * 18);
        put(u, v, region);
      }
    }
  });
  // trim / pad to exactly N (pad with extra Manhattan infill)
  while (pts.length > N) pts.splice(Math.floor(rnd() * pts.length), 1);
  let guard = 0;
  while (pts.length < N && guard++ < 4000) {
    const u = 0.03 + rnd() * 0.94, v = (rnd() * 2 - 1) * (MAN_W - 14);
    if (inPark(u, v, 0.008) || inWater(u, v)) continue;
    const p = uv(u, v);
    if (pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 30)) continue;
    put(u, v, 'manhattan');
  }
  // number top-left -> bottom-right in bands, like a printed board
  pts.sort((a, b) => (Math.floor(a.y / 56) - Math.floor(b.y / 56)) || (a.x - b.x));
  return pts;
}

/* ---------------- geometry helpers ---------------- */
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function orient(p, q, r) { return Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)); }
function segCross(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false;
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
}
// does the segment i-j cross water (sampled), outside any bridge corridor?
function crossesWater(P, i, j, corridorOk) {
  for (let t = 0.08; t < 1; t += 0.08) {
    const x = P[i].x + (P[j].x - P[i].x) * t, y = P[i].y + (P[j].y - P[i].y) * t;
    // invert to (u,v) via projection
    const rx = x - A.x, ry = y - A.y;
    const u = (rx * UN.x + ry * UN.y) / AXLEN, v = rx * VN.x + ry * VN.y;
    if (inWater(u, v)) {
      if (corridorOk && v < 0) { // East River corridors only
        const nearBridge = BRIDGES_U.some((bu) => Math.abs(u - bu) < 0.028);
        if (nearBridge) continue;
      }
      return true;
    }
  }
  return false;
}

/* ---------------- edges ---------------- */
function buildTaxi(P) {
  const cand = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const d = dist(P[i], P[j]);
    if (d <= TAXI_MAX && d >= 22) cand.push({ i, j, d });
  }
  cand.sort((a, b) => a.d - b.d);
  const deg = new Array(N).fill(0), edges = [];
  const crossesAny = (i, j) => edges.some((e) => segCross(P[i], P[j], P[e.i], P[e.j]));
  for (const e of cand) {
    if (deg[e.i] >= TAXI_CAP || deg[e.j] >= TAXI_CAP) continue;
    if (crossesWater(P, e.i, e.j, true)) continue;
    if (crossesAny(e.i, e.j)) continue;
    edges.push(e); deg[e.i]++; deg[e.j]++;
  }
  // connect within each landmass first (never bridge water here)
  const uf = new Array(N).fill(0).map((_, i) => i);
  const find = (x) => (uf[x] === x ? x : (uf[x] = find(uf[x])));
  edges.forEach((e) => { uf[find(e.i)] = find(e.j); });
  for (let pass = 0; pass < 40; pass++) {
    let best = null;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      if (find(i) === find(j)) continue;
      if (P[i].region !== P[j].region) continue;
      if (crossesWater(P, i, j, true)) continue;
      const d = dist(P[i], P[j]);
      if (!best || d < best.d) best = { i, j, d };
    }
    if (!best) break;
    edges.push(best); deg[best.i]++; deg[best.j]++; uf[find(best.i)] = find(best.j);
  }
  // no taxi dead ends
  for (let i = 0; i < N; i++) {
    if (deg[i] > 1) continue;
    let best = null;
    for (let j = 0; j < N; j++) {
      if (j === i || deg[j] >= TAXI_CAP + 1) continue;
      if (edges.some((e) => (e.i === i && e.j === j) || (e.i === j && e.j === i))) continue;
      const d = dist(P[i], P[j]);
      if (d > TAXI_MAX * 1.5) continue;
      if (crossesWater(P, i, j, true) || crossesAny(i, j)) continue;
      if (!best || d < best.d) best = { i, j, d };
    }
    if (best) { edges.push(best); deg[i]++; deg[best.j]++; }
  }
  return { edges, deg };
}
function farthest(P, ids, count, bias) {
  const chosen = [ids.reduce((a, b) => (bias[b] > bias[a] ? b : a))];
  while (chosen.length < count) {
    let best = -1, bs = -1;
    for (const c of ids) {
      if (chosen.includes(c)) continue;
      const dmin = Math.min(...chosen.map((s) => dist(P[c], P[s])));
      const sc = dmin * (1 + 0.06 * bias[c]);
      if (sc > bs) { bs = sc; best = c; }
    }
    chosen.push(best);
  }
  return chosen;
}
function buildBus(P, stations) {
  const cand = [];
  for (let a = 0; a < stations.length; a++) for (let b = a + 1; b < stations.length; b++) {
    const i = stations[a], j = stations[b], d = dist(P[i], P[j]);
    if (d < BUS_MIN || d > BUS_MAX) continue;
    // avenue preference: alignment of the segment with the island axis
    const dx = (P[j].x - P[i].x) / d, dy = (P[j].y - P[i].y) / d;
    const align = Math.abs(dx * UN.x + dy * UN.y); // 1 = along avenues
    cand.push({ i, j, d, score: d * (1.5 - align * 0.75) });
  }
  cand.sort((a, b) => a.score - b.score);
  const deg = {}, edges = []; stations.forEach((s) => { deg[s] = 0; });
  for (const e of cand) {
    if (deg[e.i] >= BUS_CAP || deg[e.j] >= BUS_CAP) continue;
    if (deg[e.i] >= 2 && deg[e.j] >= 2) continue;
    if (crossesWater(P, e.i, e.j, true)) continue;
    if (edges.some((x) => segCross(P[e.i], P[e.j], P[x.i], P[x.j]))) continue;
    edges.push(e); deg[e.i]++; deg[e.j]++;
  }
  // connect the bus network per landmass (metro/bridges join landmasses)
  const uf = {}; stations.forEach((s) => { uf[s] = s; });
  const find = (x) => (uf[x] === x ? x : (uf[x] = find(uf[x])));
  edges.forEach((e) => { uf[find(e.i)] = find(e.j); });
  for (let pass = 0; pass < 30; pass++) {
    let best = null;
    for (const i of stations) for (const j of stations) {
      if (i >= j || find(i) === find(j)) continue;
      if (P[i].region !== P[j].region) continue;
      if (crossesWater(P, i, j, true)) continue;
      const d = dist(P[i], P[j]);
      if (!best || d < best.d) best = { i, j, d };
    }
    if (!best) break;
    edges.push(best); uf[find(best.i)] = find(best.j);
  }
  return edges;
}
function buildMetro(P, hubs) {
  // MST with a water-crossing penalty -> tunnels exist but stay rare
  const edges = [], inT = [hubs[0]], rest = hubs.slice(1);
  while (rest.length) {
    let best = null;
    for (const t of inT) for (const r of rest) {
      const d = dist(P[t], P[r]) * (crossesWater(P, t, r, false) ? 1.7 : 1);
      if (!best || d < best.d) best = { i: t, j: r, d };
    }
    edges.push(best); inT.push(best.j); rest.splice(rest.indexOf(best.j), 1);
  }
  const deg = {}; hubs.forEach((h) => { deg[h] = 0; });
  edges.forEach((e) => { deg[e.i]++; deg[e.j]++; });
  const cand = [];
  for (let a = 0; a < hubs.length; a++) for (let b = a + 1; b < hubs.length; b++) {
    const i = hubs[a], j = hubs[b], d = dist(P[i], P[j]);
    if (d > 130 && d < 420 && !edges.some((e) => (e.i === i && e.j === j) || (e.i === j && e.j === i))) cand.push({ i, j, d });
  }
  cand.sort((a, b) => a.d - b.d);
  for (const e of cand) {
    if (edges.length >= hubs.length - 1 + METRO_EXTRA) break;
    if (deg[e.i] >= 3 || deg[e.j] >= 3) continue;
    edges.push(e); deg[e.i]++; deg[e.j]++;
  }
  return edges;
}
function shoreStations(P, region, side, u0, u1) {
  // stations in `region` closest to the given river shore within [u0,u1]
  return Array.from({ length: N }, (_, i) => i)
    .filter((i) => P[i].region === region && P[i].u >= u0 && P[i].u <= u1)
    .sort((a, b) => (side > 0 ? P[b].v - P[a].v : P[a].v - P[b].v));
}
function buildFerry(P) {
  const edges = [], used = [];
  const pick = (region, side, u0, u1) => {
    const c = shoreStations(P, region, side, u0, u1).filter((i) => !used.includes(i))[0];
    if (c !== undefined) used.push(c);
    return c;
  };
  // Hudson route: Hoboken terminal <-> two Manhattan west-side piers
  const j1 = pick('jersey', -1, 0.0, 0.35);
  const m1 = pick('manhattan', 1, 0.06, 0.22);
  const m2 = pick('manhattan', 1, 0.3, 0.5);
  if (j1 !== undefined && m1 !== undefined) edges.push({ i: j1, j: m1 });
  if (j1 !== undefined && m2 !== undefined) edges.push({ i: j1, j: m2 });
  // East River routes: Brooklyn and Williamsburg terminals to east-side piers
  const b1 = pick('brooklyn', 1, 0.05, 0.4);
  const m3 = pick('manhattan', -1, 0.05, 0.25);
  const q1 = pick('queens', 1, 0.6, 0.9);
  const m4 = pick('manhattan', -1, 0.55, 0.8);
  if (b1 !== undefined && m3 !== undefined) edges.push({ i: b1, j: m3 });
  if (q1 !== undefined && m4 !== undefined) edges.push({ i: q1, j: m4 });
  if (b1 !== undefined && q1 !== undefined) edges.push({ i: b1, j: q1 }); // harbor run
  return edges;
}
function bridgeEdges(P) {
  // explicit taxi+bus pairs across the East River at the bridge corridors
  const out = [];
  BRIDGES_U.forEach((bu) => {
    let bi = -1, bj = -1, bd = 1e9;
    for (let i = 0; i < N; i++) {
      if (P[i].region !== 'manhattan' || P[i].v > EAST_C + RIVER_W / 2 + 90 || Math.abs(P[i].u - bu) > 0.06) continue;
      for (let j = 0; j < N; j++) {
        if (P[j].region !== 'brooklyn' && P[j].region !== 'queens') continue;
        if (Math.abs(P[j].u - bu) > 0.06) continue;
        const d = dist(P[i], P[j]);
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
    }
    if (bi >= 0 && bj >= 0 && bd < 200) out.push({ i: bi, j: bj, u: bu });
  });
  return out;
}

/* ---------------- assembly ---------------- */
function generate() {
  const P = place();
  const { edges: taxi, deg: tDeg } = buildTaxi(P);
  const bridges = bridgeEdges(P);
  bridges.forEach((b) => { taxi.push({ i: b.i, j: b.j }); tDeg[b.i]++; tDeg[b.j]++; });
  const allIds = Array.from({ length: N }, (_, i) => i);
  const busStations = farthest(P, allIds, BUS_COUNT, tDeg);
  const bus = buildBus(P, busStations);
  bridges.forEach((b) => { bus.push({ i: b.i, j: b.j }); });
  const hubs = farthest(P, busStations, METRO_COUNT, tDeg);
  const metro = buildMetro(P, hubs);
  const ferry = buildFerry(P);

  // full-graph connectivity check without ferry (engine requirement)
  const nbr = {}; for (let i = 0; i < N; i++) nbr[i] = [];
  [].concat(taxi, bus, metro).forEach((e) => { nbr[e.i].push(e.j); nbr[e.j].push(e.i); });
  const seen = new Set([0]), q = [0];
  while (q.length) { const v = q.pop(); nbr[v].forEach((w) => { if (!seen.has(w)) { seen.add(w); q.push(w); } }); }
  if (seen.size !== N) throw new Error('not connected without ferry: ' + seen.size + '/' + N);

  const good = allIds.filter((i) => tDeg[i] >= 3);
  const mrx = farthest(P, good, 13, tDeg);
  const detPool = good.filter((i) => !mrx.includes(i));
  const det = farthest(P, detPool, 18, tDeg);

  const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const posRaw = P.map((p, i) => (i + 1) + ':' + fmt(p.x) + ',' + fmt(p.y)).join(';');
  const dedupe = new Set();
  const edgeStr = (list, t) => list.map((e) => {
    const a = Math.min(e.i, e.j) + 1, b = Math.max(e.i, e.j) + 1;
    const k = a + '-' + b + '-' + t;
    if (dedupe.has(k)) return null;
    dedupe.add(k); return k;
  }).filter(Boolean);
  const edgRaw = [].concat(edgeStr(taxi, 't'), edgeStr(bus, 'b'), edgeStr(metro, 'u'), edgeStr(ferry, 'f')).join(';');

  // render metadata (canvas space)
  const sampleRiver = (center) => {
    const pts = [];
    for (let u = -0.1; u <= 1.1; u += 0.04) {
      const band = riverBand(center, u);
      const c = uv(u, (band.lo + band.hi) / 2);
      pts.push([Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10]);
    }
    return pts;
  };
  const parkPoly = [
    uv(PARK.u0, PARK.v0), uv(PARK.u1, PARK.v0), uv(PARK.u1, PARK.v1), uv(PARK.u0, PARK.v1),
  ].map((p) => [Math.round(p.x), Math.round(p.y)]);
  const dAnchor = (u, v) => { const p = uv(u, v); return [Math.round(p.x), Math.round(p.y)]; };
  const districts = [
    ['FINANCIAL DISTRICT', 0.05, 0], ['TRIBECA', 0.13, 55], ['SOHO', 0.18, -45],
    ['GREENWICH VILLAGE', 0.27, 5], ['CHELSEA', 0.36, 70], ['MIDTOWN', 0.5, 0],
    ["HELL'S KITCHEN", 0.55, 85], ['MURRAY HILL', 0.56, -80], ['UPPER WEST SIDE', 0.7, 90],
    ['UPPER EAST SIDE', 0.72, -90], ['HARLEM', 0.92, 0],
    ['HOBOKEN', 0.16, HUD_C + RIVER_W / 2 + 55], ['BROOKLYN HEIGHTS', 0.2, EAST_C - RIVER_W / 2 - 70],
    ['WILLIAMSBURG', 0.72, EAST_C - RIVER_W / 2 - 60],
  ].map(([name, u, v]) => ({ name, at: dAnchor(u, v) }));
  const bridgePts = bridges.map((b) => {
    const m = { x: (P[b.i].x + P[b.j].x) / 2, y: (P[b.i].y + P[b.j].y) / 2 };
    return [Math.round(m.x), Math.round(m.y), Math.round(Math.atan2(P[b.j].y - P[b.i].y, P[b.j].x - P[b.i].x) * 180 / Math.PI)];
  });
  const geo = {
    gridAngle: Math.atan2(AXIS.dy, AXIS.dx),
    rivers: [
      { name: 'THE HUDSON', w: RIVER_W, pts: sampleRiver(HUD_C) },
      { name: 'EAST RIVER', w: RIVER_W, pts: sampleRiver(EAST_C) },
    ],
    park: { name: 'CENTRAL PARK', poly: parkPoly },
    districts,
    bridges: bridgePts,
    landmarks: [
      { name: 'BROOKLYN BRIDGE', at: bridgePts[0] ? [bridgePts[0][0], bridgePts[0][1] + 24] : [200, 640] },
      { name: 'GRAND TERMINAL', at: dAnchor(0.5, -20) },
      { name: 'HARBOR LIGHT', at: dAnchor(-0.02, EAST_C) },
    ],
  };
  return {
    posRaw, edgRaw,
    mrxStarts: mrx.map((i) => i + 1).sort((a, b) => a - b),
    detStarts: det.map((i) => i + 1).sort((a, b) => a - b),
    geo,
    stats: {
      taxi: edgeStr.length, // placeholder; real counts below
      counts: {
        taxi: taxi.length, bus: bus.length, metro: metro.length, ferry: ferry.length,
        bridges: bridges.length,
      },
      regions: P.reduce((m, p) => { m[p.region] = (m[p.region] || 0) + 1; return m; }, {}),
    },
  };
}

function write(g) {
  const fs = require('fs'), path = require('path');
  const file = path.join(__dirname, '..', '..', 'mapdata-ny.js');
  const out = '/* Generated by tools/mapgen/newyork.js — do not hand-edit.\n' +
    ' * Regenerate: node tools/mapgen/newyork.js --write */\n' +
    'MAPS.newyork={\n' +
    "  key:'newyork',name:'New York',tagline:'hunt across new york',\n" +
    '  pos:"' + g.posRaw + '",\n' +
    '  edges:"' + g.edgRaw + '",\n' +
    '  mrxStarts:[' + g.mrxStarts.join(',') + '],\n' +
    '  detStarts:[' + g.detStarts.join(',') + '],\n' +
    '  det:{t:' + DET_TICKETS.t + ',b:' + DET_TICKETS.b + ',u:' + DET_TICKETS.u + '},\n' +
    '  geo:' + JSON.stringify(g.geo) + '\n' +
    '};\n' +
    "DEFAULT_MAP='newyork';\n";
  fs.writeFileSync(file, out);
  console.log('mapdata-ny.js written.');
}

const g = generate();
console.log('New York generated:', JSON.stringify({ counts: g.stats.counts, regions: g.stats.regions }, null, 2));
console.log('Phantom starts:', g.mrxStarts.join(', '));
console.log('Agent starts:  ', g.detStarts.join(', '));
if (process.argv.includes('--write')) write(g);
else console.log('(dry run — pass --write to bake into mapdata-ny.js)');
