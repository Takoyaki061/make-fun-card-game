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

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

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
