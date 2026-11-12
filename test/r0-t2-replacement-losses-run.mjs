// Every program's whole-program facts under `decide` (dossier §18.186),
// from the committed checker: today's `compile` of the program, and each
// declaration `decide` leaves unsolved (RT8's decisions,
// test/r0-rt8-run.mjs). The sources are the effect pin's (the pinned
// corpus, the R022 probes and the inline defect probes), so the gap
// lists' programs are all among them. Corpus-observed; shared by the
// serial test and the writer, scripts/r0-t2-replacement-losses-pin.mjs.
import { compile } from '../output/Program.Compile/index.js';
import { describe, verdictClass } from './r0-decide-support.mjs';
import { sourcesOf } from './r0-effects-pin-run.mjs';
import { declarationsOf } from './r0-rt8-run.mjs';

const named = value => value.constructor.name;

export const programOf = source => ({
  origin: source.origin,
  today: named(compile(source.source)) === 'Right' ? 'compiles'
    : 'refused',
  blockers: declarationsOf(source)
    .filter(row => verdictClass(row.decision) !== 'Solved')
    .map(row => ({ name: row.decl.name,
      decide: verdictClass(row.decision),
      reason: describe(row.decision).verdict })) });

export const observedPrograms = async () =>
  (await sourcesOf()).map(programOf);
