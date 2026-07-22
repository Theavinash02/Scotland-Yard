#!/usr/bin/env node
/* Builds the lean web bundle Capacitor ships into the native apps.
 *
 * This is a no-build app, but Capacitor copies its whole `webDir` into each
 * native project — so instead of pointing webDir at the repo root (which would
 * drag in node_modules, tests, tools and screenshots) we copy just the runtime
 * files into `www/`. Run automatically by the `cap:*` npm scripts.
 *
 * Usage: node tools/build-www.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'www');

// The exact runtime the browser loads (mirror index.html's <script>/<link> tags).
const FILES = [
  'index.html', 'styles.css', 'sw.js', 'manifest.json', 'privacy-policy.html',
  'engine.js', 'bots.js', 'map.js', 'mapart.js', 'mapdata.js', 'mapdata-ny.js',
  'history.js', 'persistence.js', 'intro.js', 'sound.js', 'enhancements.js',
  'ui.js', 'tutorial.js', 'cloud.js', 'firebase-config.js',
  'monetization-config.js', 'ads.js', 'native-init.js',
];
const DIRS = ['icons', 'screenshots'];

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name), d = path.join(dst, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });

let missing = 0;
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) { console.warn('  ! missing runtime file:', f); missing++; continue; }
  fs.copyFileSync(src, path.join(OUT, f));
}
for (const d of DIRS) {
  const src = path.join(ROOT, d);
  if (fs.existsSync(src)) copyDir(src, path.join(OUT, d));
}

if (missing) { console.error('build-www: ' + missing + ' runtime file(s) missing — aborting.'); process.exit(1); }
console.log('build-www: wrote ' + (FILES.length + DIRS.length) + ' entries to www/');
