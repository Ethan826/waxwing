// R0 a-min tranche 1 regression probe for the coverage accounting (Task
// 13), spread into test/regression-r0-amin.mjs. It reads the fixture rows
// of test/fixtures/r0/effects-coverage.json from the compiler under test
// and applies the coverage test's own check (the recording half only: no
// verdict is decided here).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recordedProblems } from './r0-effects-coverage-sites.mjs';
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

const fixtureFile = fileURLToPath(new URL(
  './fixtures/r0/effects-coverage.json', import.meta.url));

export const coverageProbes = {
  'r0-amin-coverage-equal': async context => {
    const { fieldsOf } = await toolkit(context);
    const rows = JSON.parse(readFileSync(fixtureFile, 'utf8'))
      .filter(row => 'fixture' in row && row.obligation.startsWith('Equal'));
    const lost = rows.filter(row => {
      const [decl] = row.site.split(':');
      const { obligations } = fieldsOf(row.fixture, decl).effects;
      return recordedProblems(obligations, row).length > 0;
    });
    if (lost.length > 0)
      fail(`${lost.length} of ${rows.length} coverage fixture rows lost `
        + `their Equal obligation: ${lost[0].rule}`);
    passed(context);
  }
};
