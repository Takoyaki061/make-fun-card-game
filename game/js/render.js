// render.js — draws the table: the title screen, the lanes, both hands,
// the lantern totals, and the win/loss screens. All visuals are DOM and CSS
// (no images), so every card is crisp at thumbnail size and every tint is
// told apart by colour and shape.
//
// Cards slide in with a CSS transition when they are dealt or placed, flip
// face-up on reveal (rotateY), and snap into their lane with a short settle
// animation. A win lands with a lantern flourish: rising ember dots.

import { LANES, TOTAL_ROUNDS, isAnchored, laneOutcome, projectedScores } from './rules.js';
import { TINTS } from './deck.js';
import { wardenName } from './ai.js';

export function tintGlyph(tint) {
  return TINTS[tint].glyph;
}

export function tintLabel(tint) {
  return TINTS[tint].name;
}

/** One card element. `faceDown` shows the patterned back instead. */
export function cardElement(card, { faceDown = false, selectable = false, selected = false, small = false } = {}) {
  const el = document.createElement('div');
  el.className = 'card' + (faceDown ? ' face-down' : '') + (selectable ? ' selectable' : '')
    + (selected ? ' selected' : '') + (small ? ' small' : '');
  el.dataset.cardId = card.id;
  if (faceDown) {
    el.innerHTML = '<div class="card-back"><span class="back-glyph">✦</span><span class="back-word">PALISADE</span></div>';
    return el;
  }
  const tint = TINTS[card.tint];
  el.style.setProperty('--tint', tint.color);
  el.style.setProperty('--tint-dark', tint.dark);
  el.innerHTML =
    '<div class="card-corner top"><span class="pip">' + card.pip + '</span>' +
    '<span class="glyph">' + tint.glyph + '</span></div>' +
    '<div class="card-center"><span class="big-glyph">' + tint.glyph + '</span>' +
    '<span class="big-pip">' + card.pip + '</span></div>' +
    '<div class="card-corner bottom"><span class="pip">' + card.pip + '</span>' +
    '<span class="glyph">' + tint.glyph + '</span></div>' +
    '<div class="card-tint-name">' + tint.name + '</div>';
  return el;
}

/** Draw the whole table from the match state. `ui` carries transient UI state. */
export function renderTable(match, ui) {
  const { scores, perLane } = projectedScores(match);
  setText('round-label', 'Round ' + Math.min(match.round, TOTAL_ROUNDS) + ' / ' + TOTAL_ROUNDS);
  setText('score-you', String(scores.you));
  setText('score-rival', String(scores.rival));
  setText('shift-you', match.shifts.you > 0 ? 'Shift ready' : 'Shift spent');
  setText('shift-rival', match.shifts.rival > 0 ? 'Shift ready' : 'Shift spent');

  renderRivalHand(match);
  renderIntent(match, ui);
  renderLanes(match, perLane, ui);
  renderPlayerHand(match, ui);
  renderLog(match);
  document.getElementById('shift-btn').disabled = match.shifts.you < 1 || match.phase !== 'play';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderRivalHand(match) {
  const zone = document.getElementById('rival-hand');
  zone.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'hand-label';
  label.textContent = wardenName() + ' — ' + match.hands.rival.length + ' cards';
  zone.appendChild(label);
  const backs = document.createElement('div');
  backs.className = 'hand-backs';
  for (const card of match.hands.rival) {
    backs.appendChild(cardElement(card, { faceDown: true, small: true }));
  }
  zone.appendChild(backs);
}

function renderIntent(match, ui) {
  const box = document.getElementById('intent-box');
  if (!ui.intentTint || match.phase !== 'play') {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  const tint = TINTS[ui.intentTint];
  box.innerHTML = '<span class="intent-title">Warden&rsquo;s intent</span>' +
    '<span class="intent-glyph" style="color:' + tint.color + '">' + tint.glyph + '</span>' +
    '<span class="intent-name">' + tint.name + '</span>' +
    '<span class="intent-hint">favours this tint this round</span>';
}

function renderLanes(match, perLane, ui) {
  const board = document.getElementById('lanes');
  board.innerHTML = '';
  for (const lane of LANES) {
    const stack = match.lanes[lane.id];
    const outcome = perLane[lane.id];
    const col = document.createElement('section');
    col.className = 'lane' + (ui.targetLane === lane.id ? ' targeted' : '');
    col.dataset.laneId = lane.id;

    const head = document.createElement('header');
    head.className = 'lane-head';
    head.innerHTML = '<span class="lane-name">' + lane.name + '</span>' +
      '<span class="lane-stake" title="Lanterns per pip">×' + lane.stake + '</span>';
    col.appendChild(head);

    const holder = document.createElement('div');
    holder.className = 'lane-holder ' + (outcome.holder || 'none');
    holder.textContent = outcome.holder === 'you' ? 'You hold it · +' + outcome.banked + ' 🏮'
      : outcome.holder === 'rival' ? 'Warden holds it · +' + outcome.banked + ' 🏮'
      : outcome.reason;
    col.appendChild(holder);

    const stacks = document.createElement('div');
    stacks.className = 'lane-stacks';
    stacks.appendChild(stackElement(stack.rival, 'rival', match, ui, lane.id));
    stacks.appendChild(stackElement(stack.you, 'you', match, ui, lane.id));
    col.appendChild(stacks);

    const foot = document.createElement('div');
    foot.className = 'lane-foot';
    foot.textContent = lane.blurb;
    col.appendChild(foot);
    board.appendChild(col);
  }
}

function stackElement(stack, side, match, ui, laneId) {
  const wrap = document.createElement('div');
  wrap.className = 'stack ' + side;
  const tag = document.createElement('div');
  tag.className = 'stack-tag';
  tag.textContent = side === 'you' ? 'YOU' : 'WARDEN';
  wrap.appendChild(tag);
  if (stack.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'stack-empty';
    empty.textContent = '—';
    wrap.appendChild(empty);
    return wrap;
  }
  stack.forEach((card, index) => {
    const isTop = index === stack.length - 1;
    const anchored = isTop && isAnchored(card, stack.slice(0, -1));
    const el = cardElement(card, { small: true });
    if (anchored) {
      el.classList.add('anchored');
      el.title = 'Anchored: needs 2 more pips to take this lane';
    }
    if (ui.shiftMode && side === 'you' && isTop) {
      el.classList.add('shiftable');
      el.addEventListener('click', () => ui.onShiftCard(laneId, card.id));
    }
    wrap.appendChild(el);
  });
  return wrap;
}

function renderPlayerHand(match, ui) {
  const zone = document.getElementById('player-hand');
  zone.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'hand-label';
  label.textContent = 'Your hand — click a card, then a lane';
  zone.appendChild(label);
  const fan = document.createElement('div');
  fan.className = 'hand-fan';
  for (const card of match.hands.you) {
    const el = cardElement(card, {
      selectable: match.phase === 'play',
      selected: ui.selectedCardId === card.id,
    });
    el.style.setProperty('--deal-delay', (match.hands.you.indexOf(card) * 70) + 'ms');
    el.addEventListener('click', () => ui.onSelectCard(card.id));
    fan.appendChild(el);
  }
  zone.appendChild(fan);
}

function renderLog(match) {
  const log = document.getElementById('log');
  const last = match.log[match.log.length - 1];
  log.textContent = last || '';
}

/** Show the title overlay. */
export function showTitle() {
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('end-screen').classList.add('hidden');
}

/** Hide the title overlay when the match starts. */
export function hideTitle() {
  document.getElementById('title-screen').classList.add('hidden');
}

/** Show the win or loss screen with the final breakdown. */
export function showEndScreen(match) {
  const screen = document.getElementById('end-screen');
  const { scores, perLane } = match.scores;
  const win = match.winner === 'you';
  const tie = match.winner === 'tie';
  screen.classList.remove('hidden');
  screen.classList.toggle('win', win);
  screen.classList.toggle('lose', !win && !tie);
  document.getElementById('end-title').textContent = win ? 'YOU WIN THE PALISADE'
    : tie ? 'A DEAD HEAT' : 'THE WARDEN PREVAILS';
  document.getElementById('end-score').textContent = scores.you + ' 🏮 — ' + scores.rival + ' 🏮';
  const rows = LANES.map((lane) => {
    const o = perLane[lane.id];
    const who = o.holder === 'you' ? 'You' : o.holder === 'rival' ? 'Warden' : 'Nobody';
    return '<li><span>' + lane.name + ' ×' + lane.stake + '</span><span>' + who +
      ' · +' + o.banked + ' 🏮</span><span class="end-reason">' + o.reason + '</span></li>';
  }).join('');
  document.getElementById('end-breakdown').innerHTML = rows;
  if (win) launchEmbers(screen);
}

/** A win flourish: ember dots rising across the end screen. */
function launchEmbers(screen) {
  const layer = document.getElementById('ember-layer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < 36; i++) {
    const dot = document.createElement('span');
    dot.className = 'ember';
    dot.style.left = (Math.random() * 100) + '%';
    dot.style.animationDelay = (Math.random() * 1.2) + 's';
    dot.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
    layer.appendChild(dot);
  }
}
