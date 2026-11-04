// T6 regression probe (dossier §18.161 (4)); the rows are in
// scripts/regression-r0-t6.mjs. It runs T6's cases
// (test/r0-t6-cases.mjs) from its copy of test/ and names each case
// whose class differs from the expected one.
import { fail, passed } from './regression-r0-amin-support.mjs';
import { wrongT6Cases } from './r0-t6-cases.mjs';

export const t6Probes = {
  'r0-t6-tooling': async context => {
    const wrong = wrongT6Cases();
    if (wrong.length > 0) fail(`${context.probe}: ${JSON.stringify(wrong)}`);
    passed(context);
  }
};
