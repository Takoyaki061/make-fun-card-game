// main.js — the match loop: wire the table, run the rounds, keep score.
//
// One round: the Warden drops its Intent chit (a tint it favours), the player
// picks a card and a lane, both cards are revealed with a flip, the table
// updates, and the next round begins. After round 5 the match closes and the
// win or loss screen shows the per-lane breakdown.
//
// Sounds are tiny WebAudio beeps made in code — no sound files, no network.

import { LANES, TOTAL_ROUNDS, finishMatch, newMatch, placeCard, shiftCard } from './rules.js';
import { wardenChoosePlay, wardenChooseShift, wardenIntent, wardenQuip } from './ai.js';
import { hideTitle, renderTable, showEndScreen, showTitle } from './render.js';
import { TINTS } from './deck.js';

let match = newMatch();
let ui = freshUi();

function freshUi() {
  return {
    selectedCardId: null,
    targetLane: null,
    intentTint: null,
    shiftMode: false,
    busy: false,
    onSelectCard,
    onShiftCard,
  };
}

/** Start a match from the title screen. */
export function startMatch(seed) {
  match = newMatch(seed);
  ui = freshUi();
  ui.intentTint = wardenIntent(match);
  match.phase = 'play';
  hideTitle();
  renderTable(match, ui);
  log('Round 1 — the Warden favours ' + TINTS[ui.intentTint].name + '. Place a card.');
}

function log(line) {
  match.log.push(line);
}

/** Player clicks a card in hand: select it (or deselect). */
function onSelectCard(cardId) {
  if (match.phase !== 'play' || ui.busy) return;
  ui.shiftMode = false;
  ui.selectedCardId = ui.selectedCardId === cardId ? null : cardId;
  renderTable(match, ui);
  blip(520);
}

/** Player clicks a lane: if a card is selected, play it there. */
function onLaneClick(laneId) {
  if (match.phase !== 'play' || ui.busy) return;
  if (!ui.selectedCardId) {
    ui.targetLane = laneId;
    renderTable(match, ui);
    return;
  }
  playRound(laneId);
}

/** One full round: the player plays, the Warden answers, the table settles. */
async function playRound(laneId) {
  ui.busy = true;
  const cardId = ui.selectedCardId;
  ui.selectedCardId = null;
  ui.targetLane = null;

  const played = placeCard(match, 'you', cardId, laneId);
  if (!played) { ui.busy = false; return; }
  blip(660);
  renderTable(match, ui);
  await pause(450);

  const wardenPlay = wardenChoosePlay(match, ui.intentTint);
  const rivalCard = placeCard(match, 'rival', wardenPlay.card.id, wardenPlay.laneId);
  log(wardenQuip(match, wardenPlay));
  blip(440);
  renderTable(match, ui);
  await pause(650);

  // The Warden spends its Shift late, only when it is behind.
  const shift = wardenChooseShift(match);
  if (shift) {
    shiftCard(match, 'rival', shift.laneId, shift.cardId, shift.newTint);
    log('Warden Ash Shifts a card to ' + TINTS[shift.newTint].name + ' — the lane anchors.');
    renderTable(match, ui);
    await pause(500);
  }

  if (match.round >= TOTAL_ROUNDS) {
    finishMatch(match);
    renderTable(match, ui);
    await pause(400);
    showEndScreen(match);
    if (match.winner === 'you') fanfare();
    else lowNote();
    return;
  }
  match.round += 1;
  ui.intentTint = wardenIntent(match);
  log('Round ' + match.round + ' — the Warden favours ' + TINTS[ui.intentTint].name + '. Place a card.');
  ui.busy = false;
  renderTable(match, ui);
}

/** The player's Shift: retint one of their own top cards in a lane. */
function onShiftCard(laneId, cardId) {
  if (match.phase !== 'play' || ui.busy || match.shifts.you < 1) return;
  const stack = match.lanes[laneId].you;
  const card = stack.find((c) => c.id === cardId);
  if (!card) return;
  // Cycle the tint one step: Rust -> Ash -> Verd -> Rust.
  const target = nextTint(card.tint);
  shiftCard(match, 'you', laneId, cardId, target);
  log('You Shift a card to ' + TINTS[target].name + '.');
  ui.shiftMode = false;
  renderTable(match, ui);
  blip(760);
}

function nextTint(current) {
  const order = ['rust', 'ash', 'verd'];
  return order[(order.indexOf(current) + 1) % order.length];
}

/** Small helpers: timing and WebAudio beeps. */
function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let audioCtx = null;
function blip(freq) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (err) { /* sound is garnish; a silent table still plays */ }
}

function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f), i * 130));
}

function lowNote() {
  [330, 262, 196].forEach((f, i) => setTimeout(() => blip(f), i * 160));
}

/** Wire the static controls once the page loads. */
export function boot() {
  document.getElementById('play-btn').addEventListener('click', () => startMatch());
  document.getElementById('again-btn').addEventListener('click', () => {
    document.getElementById('end-screen').classList.add('hidden');
    startMatch(Math.floor(Math.random() * 100000));
  });
  document.getElementById('shift-btn').addEventListener('click', () => {
    if (match.phase !== 'play' || match.shifts.you < 1) return;
    ui.shiftMode = !ui.shiftMode;
    log(ui.shiftMode
      ? 'Shift armed — click one of your top cards in a lane to retint it.'
      : 'Shift disarmed.');
    renderTable(match, ui);
  });
  document.getElementById('lanes').addEventListener('click', (event) => {
    const laneEl = event.target.closest('.lane');
    if (laneEl) onLaneClick(laneEl.dataset.laneId);
  });
  document.addEventListener('keydown', (event) => {
    if (match.phase !== 'play' || ui.busy) return;
    const hand = match.hands.you;
    const digit = parseInt(event.key, 10);
    if (digit >= 1 && digit <= hand.length) onSelectCard(hand[digit - 1].id);
    if (event.key === 'Escape') { ui.selectedCardId = null; ui.shiftMode = false; renderTable(match, ui); }
  });
  showTitle();
  renderTable(match, ui);
}

// Expose the match for the screenshot hooks (shots.js) and for debugging.
export function getMatch() {
  return match;
}

export function setMatch(next) {
  match = next;
}

export function getUi() {
  return ui;
}

export function setUi(next) {
  ui = next;
}
