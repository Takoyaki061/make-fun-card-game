// rules.js — the state of one PALISADE match and the rules that move it.
//
// The match: 3 lanes, 5 rounds. Each round both players place one card from
// their hand of 6 into one lane. Cards stay where they are placed, stacked in
// the lane. At the end of round 5 each lane pays out:
//
//   * a lane's holder is the side whose TOP card in that lane has the higher
//     pip — unless the top card is anchored, in which case the other side
//     must beat it by 2 or more to take the lane;
//   * a card is anchored when its tint matches the tint of the card directly
//     beneath it in the same lane (Ember matches any tint);
//   * the holder banks stake x their top pip in lanterns.
//
// Each side also holds one Shift per match: retint one of their own placed
// cards. A Shift can turn a plain card into an anchor — or break an anchor.
//
// Scoring is live: the table always shows each side's projected lanterns
// from the lanes as they stand, so every placement visibly moves the score.

import { TINT_IDS, dealHands, tintsMatch } from './deck.js';

export const LANES = [
  { id: 'hearth', name: 'Hearth', stake: 1, blurb: 'The warm lane' },
  { id: 'market', name: 'Market', stake: 2, blurb: 'The busy lane' },
  { id: 'spire',   name: 'Spire',   stake: 3, blurb: 'The tall lane' },
];

export const TOTAL_ROUNDS = 5;

/** A fresh match. `seed` drives the deal so a match can be replayed. */
export function newMatch(seed = 20261122) {
  const hands = dealHands(seed);
  return {
    seed,
    round: 1,
    phase: 'title', // title | play | reveal | over
    hands,
    // lanes: { hearth: { you: [card,...], rival: [card,...] }, ... }
    lanes: Object.fromEntries(LANES.map((l) => [l.id, { you: [], rival: [] }])),
    shifts: { you: 1, rival: 1 },
    log: ['Welcome to Palisade. Place a card to open round 1.'],
    lastPlays: null, // { you: {card, lane}, rival: {card, lane} } of the round just played
    winner: null,    // 'you' | 'rival' | 'tie' once the match is over
    scores: null,    // final per-lane breakdown once the match is over
  };
}

/** Is `card` anchored on top of `stack` (the lane stack of its own side)? */
export function isAnchored(card, stack) {
  if (!stack || stack.length === 0) return false;
  const below = stack[stack.length - 1];
  return tintsMatch(card.tint, below.tint);
}

/**
 * Who holds a lane right now, and why.
 * Returns { holder: 'you'|'rival'|null, reason: string, banked: number }.
 * An anchored top card needs the other side to beat it by 2+ to take the lane.
 */
export function laneOutcome(laneStack) {
  const youTop = laneStack.you[laneStack.you.length - 1] || null;
  const rivalTop = laneStack.rival[laneStack.rival.length - 1] || null;
  if (!youTop && !rivalTop) return { holder: null, reason: 'Empty lane', banked: 0 };
  if (!rivalTop) return { holder: 'you', reason: 'Uncontested', banked: youTop.pip };
  if (!youTop) return { holder: 'rival', reason: 'Uncontested', banked: rivalTop.pip };

  const youAnchored = isAnchored(youTop, laneStack.you.slice(0, -1));
  const rivalAnchored = isAnchored(rivalTop, laneStack.rival.slice(0, -1));
  if (youTop.pip === rivalTop.pip) {
    if (youAnchored && !rivalAnchored) return { holder: 'you', reason: 'Anchored hold', banked: youTop.pip };
    if (rivalAnchored && !youAnchored) return { holder: 'rival', reason: 'Anchored hold', banked: rivalTop.pip };
    return { holder: null, reason: 'Tied pips', banked: 0 };
  }
  if (youTop.pip > rivalTop.pip) {
    if (rivalAnchored && youTop.pip < rivalTop.pip + 2) {
      return { holder: 'rival', reason: 'Anchor holds against ' + youTop.pip, banked: rivalTop.pip };
    }
    return { holder: 'you', reason: 'Higher pip', banked: youTop.pip };
  }
  if (youAnchored && rivalTop.pip < youTop.pip + 2) {
    return { holder: 'you', reason: 'Anchor holds against ' + rivalTop.pip, banked: youTop.pip };
  }
  return { holder: 'rival', reason: 'Higher pip', banked: rivalTop.pip };
}

/** Projected lanterns for both sides from the lanes as they stand now. */
export function projectedScores(match) {
  const scores = { you: 0, rival: 0 };
  const perLane = {};
  for (const lane of LANES) {
    const outcome = laneOutcome(match.lanes[lane.id]);
    perLane[lane.id] = { ...outcome, banked: outcome.banked * lane.stake };
    if (outcome.holder) scores[outcome.holder] += outcome.banked * lane.stake;
  }
  return { scores, perLane };
}

/** Place a card from a hand into a lane. Returns the placed card or null. */
export function placeCard(match, side, cardId, laneId) {
  const hand = match.hands[side];
  const at = hand.findIndex((c) => c.id === cardId);
  if (at < 0) return null;
  const [card] = hand.splice(at, 1);
  match.lanes[laneId][side].push(card);
  return card;
}

/** Retint one of `side`'s placed cards. Consumes the side's Shift. */
export function shiftCard(match, side, laneId, cardId, newTint) {
  if (match.shifts[side] < 1) return false;
  if (!TINT_IDS.includes(newTint) && newTint !== 'ember') return false;
  const stack = match.lanes[laneId][side];
  const card = stack.find((c) => c.id === cardId);
  if (!card) return false;
  card.tint = newTint;
  match.shifts[side] -= 1;
  return true;
}

/** Close the match: final per-lane breakdown, winner, and tie-break. */
export function finishMatch(match) {
  const { scores, perLane } = projectedScores(match);
  let winner = null;
  if (scores.you !== scores.rival) {
    winner = scores.you > scores.rival ? 'you' : 'rival';
  } else {
    // Tie-break: more lanes held wins; then the higher total of top pips.
    const lanesHeld = { you: 0, rival: 0 };
    const topPips = { you: 0, rival: 0 };
    for (const lane of LANES) {
      const outcome = perLane[lane.id];
      if (outcome.holder) lanesHeld[outcome.holder] += 1;
      for (const side of ['you', 'rival']) {
        const stack = match.lanes[lane.id][side];
        if (stack.length) topPips[side] += stack[stack.length - 1].pip;
      }
    }
    if (lanesHeld.you !== lanesHeld.rival) winner = lanesHeld.you > lanesHeld.rival ? 'you' : 'rival';
    else if (topPips.you !== topPips.rival) winner = topPips.you > topPips.rival ? 'you' : 'rival';
    else winner = 'tie';
  }
  match.phase = 'over';
  match.winner = winner;
  match.scores = { scores, perLane };
  return match;
}
