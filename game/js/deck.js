// deck.js — what a card is, the four tints, and the deck PALISADE plays with.
//
// A card has a pip (its strength, 1-5) and a tint. Tints are always told apart
// by colour AND by shape, never by text alone:
//   Rust  — ember orange, triangle
//   Ash   — slate blue,   square
//   Verd  — leaf green,   circle
//   Ember — gold,         star (a wild tint: it anchors with any tint)
//
// The deck holds two copies of every pip x tint pair (30 cards) plus two Ember
// wilds (pip 2). Each player is dealt 6; the rest stays in the draw pile.

export const TINTS = {
  rust:  { name: 'Rust',  color: '#e8632c', dark: '#a83c12', shape: 'triangle', glyph: '▲' },
  ash:   { name: 'Ash',   color: '#5b7fa6', dark: '#33506e', shape: 'square',   glyph: '■' },
  verd:  { name: 'Verd',  color: '#3fae6a', dark: '#227a44', shape: 'circle',   glyph: '●' },
  ember: { name: 'Ember', color: '#f2b705', dark: '#a67c00', shape: 'star',     glyph: '★' },
};

export const TINT_IDS = ['rust', 'ash', 'verd'];

let nextCardId = 1;

/** Make one card object. `owner` is 'you' or 'rival' once it is dealt. */
export function makeCard(pip, tint, owner = null) {
  return { id: nextCardId++, pip, tint, owner };
}

/** The full 32-card deck, in a fixed order before shuffling. */
export function buildDeck() {
  const deck = [];
  for (const tint of TINT_IDS) {
    for (let pip = 1; pip <= 5; pip++) {
      deck.push(makeCard(pip, tint));
      deck.push(makeCard(pip, tint));
    }
  }
  deck.push(makeCard(2, 'ember'));
  deck.push(makeCard(2, 'ember'));
  return deck;
}

/** Mulberry32: a small seeded generator so screenshot states are repeatable. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle with a supplied random function. */
export function shuffle(deck, random) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Deal 6 cards to each side from a freshly shuffled deck. */
export function dealHands(seed) {
  const random = seededRandom(seed);
  const deck = shuffle(buildDeck(), random);
  return {
    you: deck.slice(0, 6).map((c) => ({ ...c, owner: 'you' })),
    rival: deck.slice(6, 12).map((c) => ({ ...c, owner: 'rival' })),
    pile: deck.slice(12),
  };
}

/** A tint matches another for anchoring: same tint, or either side is Ember. */
export function tintsMatch(a, b) {
  return a === b || a === 'ember' || b === 'ember';
}
