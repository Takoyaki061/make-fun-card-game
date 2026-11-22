// shots.js — fixed states for the maker's screenshots.
//
// The game reads ?shot= from the URL. Each value builds one exact table so
// the screenshots are repeatable renders of the game's own code:
//
//   ?shot=title  — the title screen over a fresh table
//   ?shot=play   — round 3, cards in every lane, a card selected in hand
//   ?shot=win    — the final table with the win screen up
//   ?shot=lose   — the final table with the loss screen up
//
// Nothing here changes how the game plays; it only sets the state before the
// first render, the same way a player reaching that point would.

import { finishMatch, newMatch } from './rules.js';
import { makeCard } from './deck.js';
import { hideTitle, renderTable, showEndScreen, showTitle } from './render.js';
import { getMatch, getUi, setMatch, setUi } from './main.js';

/** Build the mid-game table for ?shot=play: round 3, every lane contested. */
function buildPlayState() {
  const match = newMatch(77);
  match.phase = 'play';
  match.round = 3;
  // A fixed hand for the player, so the shot always shows the same cards.
  // Two rounds played, so four cards remain from the six dealt.
  match.hands.you = [
    makeCard(5, 'rust', 'you'),
    makeCard(4, 'verd', 'you'),
    makeCard(3, 'ash', 'you'),
    makeCard(2, 'ember', 'you'),
  ];
  match.hands.rival = [
    makeCard(4, 'rust', 'rival'),
    makeCard(3, 'verd', 'rival'),
    makeCard(2, 'ash', 'rival'),
  ];
  // Hearth: you anchor Rust 3 on Rust 2; the Warden's Ash 4 cannot take it
  // (needs 2 more pips against an anchor).
  match.lanes.hearth.you = [makeCard(2, 'rust', 'you'), makeCard(3, 'rust', 'you')];
  match.lanes.hearth.rival = [makeCard(4, 'ash', 'rival')];
  // Market: the Warden leads with Verd 4; you answer with Ash 3.
  match.lanes.market.rival = [makeCard(4, 'verd', 'rival')];
  match.lanes.market.you = [makeCard(3, 'ash', 'you')];
  // Spire: you hold Verd 5; the Warden's Rust 3 waits below it.
  match.lanes.spire.you = [makeCard(5, 'verd', 'you')];
  match.lanes.spire.rival = [makeCard(3, 'rust', 'rival')];
  match.log = ['Round 3 — the Warden favours Verd. Your Rust anchor holds Hearth.'];
  return match;
}

/** Build a finished match for ?shot=win / ?shot=lose. */
function buildEndState(win) {
  const match = newMatch(99);
  match.phase = 'play';
  match.round = 5;
  match.hands.you = [makeCard(2, 'ember', 'you')];
  match.hands.rival = [makeCard(1, 'ash', 'rival')];
  if (win) {
    match.lanes.hearth.you = [makeCard(3, 'rust', 'you'), makeCard(4, 'rust', 'you')];
    match.lanes.hearth.rival = [makeCard(2, 'ash', 'rival')];
    match.lanes.market.you = [makeCard(5, 'verd', 'you')];
    match.lanes.market.rival = [makeCard(3, 'verd', 'rival')];
    match.lanes.spire.you = [makeCard(4, 'ash', 'you')];
    match.lanes.spire.rival = [makeCard(2, 'rust', 'rival')];
  } else {
    match.lanes.hearth.you = [makeCard(2, 'ash', 'you')];
    match.lanes.hearth.rival = [makeCard(4, 'rust', 'rival'), makeCard(5, 'rust', 'rival')];
    match.lanes.market.you = [makeCard(3, 'verd', 'you')];
    match.lanes.market.rival = [makeCard(4, 'ash', 'rival')];
    match.lanes.spire.you = [makeCard(2, 'rust', 'you')];
    match.lanes.spire.rival = [makeCard(5, 'verd', 'rival')];
  }
  finishMatch(match);
  const { scores } = match.scores;
  match.log = [win
    ? 'Final — you take the Palisade, ' + scores.you + ' lanterns to ' + scores.rival + '.'
    : 'Final — Warden Ash takes the Palisade, ' + scores.rival + ' lanterns to ' + scores.you + '.'];
  return match;
}

/** Apply ?shot= before the first render. Returns true when a shot applied. */
export function applyShotParam() {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot) return false;
  const ui = getUi();
  if (shot === 'title') {
    showTitle();
    renderTable(getMatch(), ui);
    return true;
  }
  if (shot === 'play') {
    const match = buildPlayState();
    setMatch(match);
    ui.intentTint = 'verd';
    ui.selectedCardId = match.hands.you[1].id; // the Verd 4, raised in the fan
    hideTitle();
    renderTable(match, ui);
    return true;
  }
  if (shot === 'win' || shot === 'lose') {
    const match = buildEndState(shot === 'win');
    setMatch(match);
    hideTitle();
    renderTable(match, ui);
    showEndScreen(match);
    return true;
  }
  return false;
}
