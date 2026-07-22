#!/usr/bin/env node
/* Renders the Shadow Line app icons (icons/icon-192.png, icon-512.png,
 * icon-maskable-512.png) from an inline SVG using the Playwright-managed
 * Chromium. Run from the repo root: `node tools/icons/make-icons.js`.
 * The mark matches the in-app header logo: a gold ring with a tracking blip,
 * on the app's midnight navy. The maskable variant pads the mark into the
 * safe zone so launcher masks never clip it. */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

function svg(size, pad) {
  const c = size / 2, R = size * (0.30 - pad * 0.28), dot = R * 0.34, ring = R * 0.30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="#1B2A44"/><stop offset="60%" stop-color="#101B2E"/><stop offset="100%" stop-color="#0A1220"/>
    </radialGradient>
    <radialGradient id="au" cx="40%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#FFE9A6"/><stop offset="45%" stop-color="#F6C945"/><stop offset="100%" stop-color="#C79A1F"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="${size * 0.012}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g filter="url(#glow)">
    <circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="url(#au)" stroke-width="${ring}"/>
    <circle cx="${c}" cy="${c}" r="${dot}" fill="url(#au)"/>
    <path d="M ${c + R * 0.80} ${c + R * 0.80} L ${c + R * 1.42} ${c + R * 1.42}" stroke="url(#au)" stroke-width="${ring * 0.85}" stroke-linecap="round"/>
  </g>
</svg>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = path.join(__dirname, '..', '..', 'icons');
  const jobs = [
    ['icon-512.png', 512, 0],
    ['icon-192.png', 192, 0],
    ['icon-maskable-512.png', 512, 0.55], // pad the mark into the mask-safe zone
  ];
  for (const [name, size, pad] of jobs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0">${svg(size, pad)}</body>`);
    await page.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote icons/' + name);
  }
  await browser.close();
})();
