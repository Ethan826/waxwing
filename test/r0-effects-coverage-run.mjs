import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { describe } from './r0-decide-support.mjs';
import { declarationsOf } from './r0-rt8-run.mjs';
import { effectsOf } from './r0-effects-obligations-run.mjs';
import { recordedProblems } from './r0-effects-coverage-sites.mjs';

// Support for the coverage test (test/r0-effects-coverage.test.mjs):
// statements section 13's rule table, the fixture rows, and what a
// fixture program records.
export const statementsFile = 'docs/plans/r0-amin-statements.md';
export const fixtureFile = 'test/fixtures/r0/effects-coverage.json';
const heading = '## 13. U6';

// Section 13's table rows as { rule, obligation } cell text. A row with
// other than two cells is an error, so a changed table cannot be misread.
export const tableRows = () => {
  const lines = readFileSync(join(repoRoot, statementsFile), 'utf8')
    .split('\n');
  const start = lines.findIndex(line => line.startsWith(heading));
  const end = lines.findIndex((line, at) => at > start
    && line.startsWith('## '));
  const rows = lines.slice(start, end).filter(line => line.startsWith('| '))
    .slice(1);
  return rows.map(cellsOf);
};

const cellsOf = line => {
  const cells = line.replace(/^\| /, '').replace(/ \|$/, '').split(' | ');
  if (cells.length !== 2) throw new Error(`not two cells: ${line}`);
  return { rule: cells[0], obligation: cells[1] };
};

export const fixtureRows = () =>
  JSON.parse(readFileSync(join(repoRoot, fixtureFile), 'utf8'));

// What a fixture row's program records: the problems found, [] when the
// named obligation is recorded at the named site with the named content.
export const checkFixture = (row, index) => {
  const [decl] = row.site.split(':');
  const origin = `coverage#${index}`;
  const found = declarationsOf({ origin, source: row.fixture })
    .find(item => item.decl.name === decl);
  if (found === undefined) return [`no declaration ${decl}`];
  const { obligations } = effectsOf(found.program, found.decl);
  const verdict = describe(found.decision).verdict.split(' ')[0] === 'Solved'
    ? 'solved' : 'blocked';
  return [...recordedProblems(obligations, row),
    ...(verdict === row.verdict ? []
      : [`verdict ${verdict}, not ${row.verdict}`])];
};
