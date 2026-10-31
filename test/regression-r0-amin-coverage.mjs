// R0 a-min tranche 1 regression probes for the coverage accounting (Task
// 13), spread into test/regression-r0-amin.mjs. Each reads the fixture
// rows of test/fixtures/r0/effects-coverage.json from the compiler under
// test and applies the coverage test's own check (the recording half
// only: no verdict is decided here).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recordedProblems } from './r0-effects-coverage-sites.mjs';
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

const fixtureFile = fileURLToPath(new URL(
  './fixtures/r0/effects-coverage.json', import.meta.url));

// The fixture parts (a row's own obligation and its `also`) naming `kind`
// that the compiler under test no longer records.
const lostParts = (fieldsOf, kind) => {
  const rows = JSON.parse(readFileSync(fixtureFile, 'utf8'))
    .filter(row => 'fixture' in row);
  const parts = rows.flatMap(row => [row, ...(row.also ?? [])]
    .filter(part => part.obligation.startsWith(kind))
    .map(part => ({ rule: row.rule, source: row.fixture, part })));
  const lost = parts.filter(({ source, part }) => recordedProblems(
    fieldsOf(source, part.site.split(':')[0]).effects, part).length > 0);
  return { lost, total: parts.length };
};

const probeFor = kind => async context => {
  const { fieldsOf } = await toolkit(context);
  const { lost, total } = lostParts(fieldsOf, kind);
  if (lost.length > 0)
    fail(`${lost.length} of ${total} coverage fixture rows lost their `
      + `${kind} obligation: ${lost[0].rule}`);
  passed(context);
};

export const coverageProbes = {
  'r0-amin-coverage-equal': probeFor('Equal'),
  'r0-amin-coverage-consume': probeFor('Consume'),
  // Task 9's records (review 2 P2-1).
  'r0-amin-coverage-installed-c': probeFor('Consume[AtInstalledC]'),
  'r0-amin-coverage-install': probeFor('Install')
};
