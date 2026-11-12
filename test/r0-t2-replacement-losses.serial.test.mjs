import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { statusFile } from './r0-t2-activation-evidence.mjs';
import { verdictsFile } from './r0-t2-gap-verdicts.mjs';
import { observedPrograms } from './r0-t2-replacement-losses-run.mjs';
import { censusFile, fileProblems, lossesFile, lossesFileOf }
  from './r0-t2-replacement-losses.mjs';

// Dossier §18.186, corpus-observed: whole-program losses under `decide`,
// recomputed from the committed checker over every source and compared
// both ways with the committed file (written by
// scripts/r0-t2-replacement-losses-pin.mjs). The activation gate reads
// the file, not this run; this test keeps it current. Serial: it
// compiles every program and runs RT8's decisions over all of them.
const json = path => JSON.parse(readFileSync(join(repoRoot, path), 'utf8'));
const census = json(censusFile);
const verdicts = json(verdictsFile);
const known = json(statusFile).knownDefects;
const observed = await observedPrograms();
const found = lossesFileOf(observed, census, verdicts, known);

const lines = file => file.programs.map(program => JSON.stringify(program));
const apart = (recorded, recomputed) => {
  const left = lines(recorded);
  const right = lines(recomputed);
  return [...left.filter(line => !right.includes(line))
    .map(line => `recorded, not observed: ${line}`),
  ...right.filter(line => !left.includes(line))
    .map(line => `observed, not recorded: ${line}`)];
};

test('the committed loss file is today\'s, both ways', () => {
  assert.ok(existsSync(join(repoRoot, lossesFile)), `no ${lossesFile};`
    + ' write it with scripts/r0-t2-replacement-losses-pin.mjs');
  const recorded = json(lossesFile);
  assert.deepEqual(apart(recorded, found), []);
  assert.deepEqual(recorded, found);
  assert.deepEqual(fileProblems(recorded, census, verdicts, known), []);
});

// The whole census union and every gap-list program are assessed, and
// FX032 is the one known defect: `g` its only blocker.
test('every census and gap-list program is assessed; FX032 apart', () => {
  const origins = new Set(found.programs.map(program => program.origin));
  for (const origin of census.union.origins) assert.ok(origins.has(origin));
  for (const entry of Object.values(verdicts.denominators).flat())
    assert.ok(origins.has(entry.origin), entry.at);
  const defects = found.programs.filter(program =>
    program.class === 'knownDefect');
  assert.deepEqual(defects.map(program => [program.origin,
    program.blockers.map(blocker => blocker.name)]),
  [['inline:fx032', ['g']]]);
});

// Must-fail on the real data: a census program dropped, a gap-list
// program dropped, FX032 relabelled lost, and a moved observation (a
// lost program now solved) are each named.
test('omissions, a wrong class and a moved observation fail', () => {
  const recorded = json(lossesFile);
  const without = origin => ({ ...recorded, programs: recorded.programs
    .filter(program => program.origin !== origin) });
  const censusOnly = recorded.programs.find(program =>
    program.class === 'lost' && program.named.join() === 'census');
  assert.match(fileProblems(without(censusOnly.origin), census, verdicts,
    known).join('\n'), new RegExp(`omitted: .*\\(census\\)`));
  assert.match(fileProblems(without('examples/records.wxw'), census,
    verdicts, known).join('\n'),
  /omitted: examples\/records\.wxw \(census, refusals\)/);
  const relabelled = structuredClone(recorded);
  relabelled.programs.find(program => program.origin === 'inline:fx032')
    .class = 'lost';
  assert.match(fileProblems(relabelled, census, verdicts, known)
    .join('\n'), /inline:fx032: class lost, but its facts give knownDefect/);
  const moved = observed.map(program => (program.origin === censusOnly.origin
    ? { ...program, blockers: [] } : program));
  assert.ok(apart(recorded, lossesFileOf(moved, census, verdicts, known))
    .some(line => line.startsWith('recorded, not observed: ')
      && line.includes(censusOnly.origin)));
});
