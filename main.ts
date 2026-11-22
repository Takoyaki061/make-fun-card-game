// main.ts — the hand-in program for PALISADE (best-card-game-20261122-1826).
//
// Node 22, standard library only. It copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json with the
// vendored make.fun library, exactly the summary the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The two runs the grader does must write the same bytes: this program only
// copies files and builds the dossier from them, so it is deterministic.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: fail fast with a plain message when a file would break the
// gate's own limits, instead of handing the scorer a refused entry.
const indexPath = join(here, 'game', 'index.html');
if (!existsSync(indexPath)) throw new Error('game/index.html is missing');
if (statSync(indexPath).size > 1048576) throw new Error('game/index.html is over the 1 MiB gate cap');
const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length > 4) throw new Error('screenshots/ holds ' + shots.length + ' images; the gate allows 4');
  for (const name of shots) {
    if (statSync(join(shotsDir, name)).size > 262144) throw new Error('screenshots/' + name + ' is over the 256 KiB gate cap');
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps mirror the gate's own limits (see the kit's RULES.txt): at most 4
// screenshots of 256 KiB each, at most 993 files and 48 MiB under game/, and
// a dossier text capped at 160 KiB. An entry that breaks any of them is
// refused here before it ever reaches the scorer.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
