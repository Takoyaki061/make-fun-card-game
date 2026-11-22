// ai.js — Warden Ash, the rival. Readable on purpose: the player should be
// able to see what the Warden wants and play around it.
//
// Each round the Warden drops a face-down Intent chit on one lane showing its
// favoured tint (the tint it most wants to anchor with). The player sees the
// tint, never the pip. The Warden then plays by a fixed, legible plan:
//
//   1. Contest the highest-stake lane it can still win, with the lowest pip
//      that takes it (it never wastes a 5 on a lane a 3 would hold).
//   2. If it can anchor — play a card whose tint matches the card beneath it
//      in that lane — it prefers the anchoring play over a raw pip win.
//   3. It saves its one Shift for rounds 4-5, spending it to retint a card
//      into an anchor when it is behind on lanterns.
//   4. When it cannot win any lane this round, it banks a low card in the
//      cheapest lane and keeps its big pips for later.

import { LANES, TOTAL_ROUNDS, isAnchored, laneOutcome, projectedScores } from './rules.js';
import { TINTS, tintsMatch } from './deck.js';

/** The tint the Warden favours this round: its most common hand tint. */
export function wardenIntent(match) {
  const hand = match.hands.rival;
  const counts = {};
  for (const card of hand) counts[card.tint] = (counts[card.tint] || 0) + 1;
  let best = 'rust';
  let bestCount = -1;
  for (const tint of Object.keys(counts)) {
    if (counts[tint] > bestCount) { best = tint; bestCount = counts[tint]; }
  }
  return best;
}

/** Which lane would the Warden most like to play in? Highest stake first. */
function lanesByDesire(match) {
  return [...LANES].sort((a, b) => b.stake - a.stake);
}

/**
 * Choose the Warden's play for this round.
 * Returns { card, laneId } — the card object from its hand and the lane id.
 */
export function wardenChoosePlay(match, intentTint) {
  const hand = match.hands.rival;
  const { scores } = projectedScores(match);
  const behind = scores.rival < scores.you;

  // Score every (card, lane) pair: how good is this placement?
  let bestPlay = null;
  let bestValue = -Infinity;
  for (const card of hand) {
    for (const lane of lanesByDesire(match)) {
      const stack = match.lanes[lane.id];
      const value = scorePlacement(match, card, lane, stack, intentTint, behind);
      if (value > bestValue) { bestValue = value; bestPlay = { card, laneId: lane.id }; }
    }
  }
  return bestPlay;
}

function scorePlacement(match, card, lane, stack, intentTint, behind) {
  let value = 0;
  const rivalStack = stack.rival;
  const youTop = stack.you[stack.you.length - 1] || null;
  const myTop = rivalStack[rivalStack.length - 1] || null;

  // Anchoring is worth a lot: a card that matches the one beneath it holds.
  if (myTop && tintsMatch(card.tint, myTop.tint)) value += 6;
  // Playing the announced intent tint is the Warden keeping its word.
  if (card.tint === intentTint) value += 2;
  // The stake is the prize: higher-stake lanes are worth more.
  value += lane.stake * 2;
  // Taking a lane the player holds is worth more than padding an empty one.
  if (youTop) {
    const anchored = myTop ? isAnchored(card, rivalStack) : false;
    const beats = anchored
      ? card.pip > youTop.pip
      : card.pip >= youTop.pip + (isAnchored(youTop, stack.you.slice(0, -1)) ? 2 : 1);
    if (beats) value += 5;
    else if (card.pip === youTop.pip) value += 1; // a tie at least contests
    // Don't throw a 5 at a lane a 2 would lose by the same margin.
    value -= Math.max(0, card.pip - (youTop.pip + 1)) * 0.5;
  } else if (!myTop) {
    value += 1; // claiming an empty lane is cheap and safe
  }
  // Late rounds, when behind, the Warden gambles on the big lane.
  if (behind && match.round >= TOTAL_ROUNDS - 1 && lane.stake === 3) value += 3;
  // Keep one big card in reserve for the final round.
  if (match.round < TOTAL_ROUNDS && card.pip === 5) value -= 2;
  return value;
}

/**
 * Should the Warden spend its Shift now, and on what?
 * Returns { laneId, cardId, newTint } or null.
 */
export function wardenChooseShift(match) {
  if (match.shifts.rival < 1) return null;
  if (match.round < TOTAL_ROUNDS - 1) return null; // it saves the Shift
  const { scores } = projectedScores(match);
  if (scores.rival >= scores.you) return null; // only spends it when behind
  for (const lane of LANES) {
    const stack = match.lanes[lane.id].rival;
    if (stack.length < 2) continue;
    const top = stack[stack.length - 1];
    const below = stack[stack.length - 2];
    if (top.tint === below.tint) continue; // already anchored
    // Retinting the top card to match the one beneath anchors the lane.
    return { laneId: lane.id, cardId: top.id, newTint: below.tint };
  }
  return null;
}

/** A one-line summary of the Warden for the table header. */
export function wardenName() {
  return 'Warden Ash';
}

/** The Warden's taunt or note for the log after it plays. */
export function wardenQuip(match, played) {
  const tint = TINTS[played.card.tint].name;
  if (played.card.pip >= 5) return `Warden Ash slams a ${tint} ${played.card.pip} into ${laneName(played.laneId)}.`;
  if (played.card.pip <= 2) return `Warden Ash slips a ${tint} ${played.card.pip} into ${laneName(played.laneId)}.`;
  return `Warden Ash plays ${tint} ${played.card.pip} in ${laneName(played.laneId)}.`;
}

function laneName(laneId) {
  const lane = LANES.find((l) => l.id === laneId);
  return lane ? lane.name : laneId;
}
