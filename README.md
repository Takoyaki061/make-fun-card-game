# PALISADE — a lantern-duel card game

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-7c5cff)](https://make.fun/bounty/best-card-game-20261122-1826)

You against **Warden Ash**, across three lanes of a lamplit table. Five rounds,
six cards, one Shift — and the lanterns go to whoever reads the table best.

## How it plays

- **Place one card a round** into Hearth (×1), Market (×2) or Spire (×3).
  Five rounds, six cards in hand — one card stays unplayed.
- **Higher pip takes the lane.** Match the tint of the card beneath yours to
  **anchor** it: an anchored card needs 2 more pips to beat.
- **Ember ★ is wild** — it anchors with any tint. Your one **Shift** retints
  a placed card, once per match.
- At the end, each lane pays **stake × top pip** in lanterns 🏮. Most lanterns
  wins the Palisade.

Tints are told apart by colour *and* shape: Rust ▲ orange, Ash ■ blue,
Verd ● green, Ember ★ gold. The Warden drops a face-down **Intent chit**
each round showing the tint it favours — you see the tint, never the pip.

## Play it

Static files, no build step, no network. Serve `game/` and open
`game/index.html` in desktop Chrome:

```sh
cd game && python3 -m http.server 8080
```

Click a card, then a lane. Keys 1–6 pick a card, Esc cancels. Sounds are
tiny WebAudio beeps made in code.

## Files

| File | Job |
| --- | --- |
| `game/index.html` | The table shell: top bar, lanes, hands, overlays |
| `game/css/table.css` | The look: felt table, cards, animations, overlays |
| `game/js/deck.js` | Cards, tints, the deck, seeded dealing |
| `game/js/rules.js` | Match state, anchoring, lane scoring, the Shift |
| `game/js/ai.js` | Warden Ash: intent chits and a readable plan |
| `game/js/render.js` | Drawing the table, cards, win/loss screens |
| `game/js/main.js` | The round loop, input, sounds |
| `game/js/shots.js` | Fixed states for the maker's screenshots |
| `main.ts` | Hand-in program: copies the game and writes the dossier |
| `vendor/makefun-game.ts` | The kit's dossier library, unchanged |

Built for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826).
Original game, art and names — no commercial game was copied.
