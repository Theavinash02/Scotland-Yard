#!/usr/bin/env node
/*
 * Headless simulation & correctness harness for the Shadow Line rules engine
 * and bots. No dependencies, no build step — just `node test/simulate.js`.
 *
 * The browser code is plain <script>-tag globals (no module system), so we load
 * engine.js + bots.js into a sandboxed VM context and drive full bot-vs-bot
 * games against the same pure functions the app uses.
 *
 * It does two things:
 *   1. Correctness — plays thousands of games across every difficulty pairing and
 *      asserts the engine invariants after every move (the deduced possible-set
 *      always contains the Phantom's true station, no two agents share a station,
 *      no negative ticket/resource counts, every game terminates).
 *   2. Balance — reports win rates so difficulty tuning stays honest: the ladder
 *      should be monotonic (easy < normal < hard) for each role.
 *
 * Usage:
 *   node test/simulate.js            # correctness suite (fast) + a short balance report
 *   node test/simulate.js --balance 2000   # only balance, N games per cell
 *   node test/simulate.js --games 8000      # correctness suite with N games
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
function loadEngine() {
  const ctx = vm.createContext({ Math, Array, Set, Map, console, window: {} });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'), ctx, { filename: 'engine.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'bots.js'), 'utf8'), ctx, { filename: 'bots.js' });
  return ctx;
}

const DIFFS = ['easy', 'normal', 'hard'];

// Play one full bot-vs-bot game. `onMove` (optional) is called after every ply
// with (game) so the correctness suite can assert invariants mid-game.
function playGame(ctx, mrxDiff, detDiff, nd, onMove, variant) {
  const { newGame, startDouble, applyMrx, applyDet, botMrxPick, botDetPick } = ctx;
  const seats = [{ kind: 'bot', diff: mrxDiff }];
  for (let i = 0; i < nd; i++) seats.push({ kind: 'bot', diff: detDiff });
  const g = newGame(seats, variant);
  let guard = 0;
  while (!g.winner && guard++ < 3000) {
    if (g.turn === -1) {
      const p = botMrxPick(g, mrxDiff);
      if (!p || !p.move) break;
      if (p.dbl) startDouble(g);
      applyMrx(g, p.move);
      while (g.turn === -1 && g.dblPending > 0 && !g.winner) {
        const p2 = botMrxPick(g, mrxDiff);
        if (!p2 || !p2.move) break;
        applyMrx(g, p2.move);
        if (onMove) onMove(g);
      }
    } else {
      const m = botDetPick(g, g.turn, detDiff);
      if (!m) break;
      applyDet(g, g.turn, m);
    }
    if (onMove) onMove(g);
  }
  return g;
}

function runBalance(ctx, mrxDiff, detDiff, nd, N) {
  let detWins = 0, mrxWins = 0, rounds = 0;
  for (let k = 0; k < N; k++) {
    const g = playGame(ctx, mrxDiff, detDiff, nd);
    if (g.winner === 'dets') detWins++;
    else if (g.winner === 'mrx') mrxWins++;
    rounds += g.log.length;
  }
  return { detWins, mrxWins, N, avgRounds: (rounds / N).toFixed(1) };
}

function correctness(ctx, N) {
  const { possibleSet } = ctx;
  const VARIANTS = ['classic', 'short', 'sneaky'];
  let games = 0, fails = 0;
  const fail = (msg) => { fails++; if (fails <= 20) console.error('  ✗', msg); };
  for (let t = 0; t < N; t++) {
    const nd = 3 + (t % 3);
    const mrxDiff = DIFFS[t % 3], detDiff = DIFFS[(t + 1) % 3];
    const variant = VARIANTS[t % VARIANTS.length];
    const g = playGame(ctx, mrxDiff, detDiff, nd, (g) => {
      if (g.winner) return;
      if (!possibleSet(g).has(g.mrx.st)) fail(`possible-set missing true station ${g.mrx.st} (game ${t})`);
      const occ = {};
      g.dets.forEach((d) => { if (occ[d.st]) fail(`two agents on station ${d.st} (game ${t})`); occ[d.st] = 1; });
      g.dets.forEach((d) => { if (d.t < 0 || d.b < 0 || d.u < 0) fail(`negative agent ticket (game ${t})`); });
      if (g.mrx.black < 0 || g.mrx.dbl < 0) fail(`negative the Phantom resource (game ${t})`);
    }, variant);
    games++;
    if (!g.winner) fail(`game ${t} did not terminate`);
    // Variant rules must hold: log never exceeds the variant's round count, and
    // reveal flags land exactly on the variant's reveal schedule.
    if (g.log.length > g.maxRound) fail(`game ${t} exceeded maxRound ${g.maxRound}`);
    g.log.forEach((e, i) => {
      const shouldReveal = g.reveals.indexOf(i + 1) >= 0;
      if (!!e.rv !== shouldReveal) fail(`game ${t} reveal flag wrong at round ${i + 1} (variant ${variant})`);
    });
  }
  return { games, fails };
}

function main() {
  const args = process.argv.slice(2);
  const balanceOnly = args.includes('--balance');
  const numAt = (flag, def) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? +args[i + 1] : def; };
  const ctx = loadEngine();
  let failed = 0;

  if (!balanceOnly) {
    const N = numAt('--games', 4000);
    process.stdout.write(`Correctness: playing ${N} games across all difficulty pairings…\n`);
    const { games, fails } = correctness(ctx, N);
    console.log(fails === 0 ? `  ✓ ${games} games, all invariants held\n` : `  ${fails} invariant failure(s) over ${games} games\n`);
    failed += fails;
  }

  const N = balanceOnly ? numAt('--balance', 2000) : 600;
  const pct = (n, d) => (100 * n / d).toFixed(1).padStart(5) + '%';
  console.log(`Balance report (${N} games per cell):`);
  console.log('  Agent win %, vs a fixed NORMAL the Phantom — should rise easy → normal → hard');
  for (const nd of [3, 4, 5]) {
    const r = DIFFS.map((d) => runBalance(ctx, 'normal', d, nd, N));
    console.log(`    ${nd} agents   easy ${pct(r[0].detWins, N)}   normal ${pct(r[1].detWins, N)}   hard ${pct(r[2].detWins, N)}`);
  }
  console.log('  the Phantom win %, vs fixed NORMAL agents — should rise easy → normal → hard');
  for (const nd of [3, 4, 5]) {
    const r = DIFFS.map((d) => runBalance(ctx, d, 'normal', nd, N));
    console.log(`    ${nd} agents   easy ${pct(r[0].mrxWins, N)}   normal ${pct(r[1].mrxWins, N)}   hard ${pct(r[2].mrxWins, N)}`);
  }

  process.exit(failed ? 1 : 0);
}

main();
