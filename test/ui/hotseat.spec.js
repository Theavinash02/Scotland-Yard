// Hot-seat privacy: with a human Phantom AND a human agent on one device, the
// app must blank the Phantom's position between turns and run the
// "pass the device" handoff in both directions.
'use strict';
const { test, expect } = require('@playwright/test');
const { bootToLobby, startLocal, trackPageErrors, revealPanel } = require('./helpers');

test('hot-seat handoff prompts in both directions and the Phantom can move', async ({ page }) => {
  const errors = trackPageErrors(page);
  await bootToLobby(page);
  await startLocal(page, [
    { kind: 'human' }, { kind: 'human' }, { kind: 'bot', diff: 'easy' },
    { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' },
  ]);

  // 1) game opens with the pass-to-Phantom privacy prompt
  const modal = page.locator('#modalBox');
  await expect(modal).toContainText(/pass the device/i);

  // 2) confirming reveals the Phantom's turn with an accessible move list
  await modal.locator('button').first().click();
  await revealPanel(page); // phone layouts keep the move list in a closed drawer
  const firstMove = page.locator('.movebtn').first();
  await expect(firstMove).toBeVisible();

  // 3) committing a move hides the Phantom again and prompts the hand-back
  await firstMove.click();
  await expect(modal).toContainText(/hand the device back/i);

  expect(errors).toEqual([]);
});
