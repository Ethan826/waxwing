// R0 a-min tranche 1 regression probe for the fail-only cohort pin
// (Task 22), spread into test/regression-r0-amin.mjs.
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertCohort, pinFile } from './r0-fail-only-compare.mjs';
import { fail, passed } from './regression-r0-amin-support.mjs';

// The real comparison (assertCohort, the code the 75 s boundary test
// runs) against a temp copy of the pin and a cohort with one verdict
// perturbed, with WXW_PIN_FAIL_ONLY=1 set: it must fail and leave the
// copy's bytes unchanged. The corpus survey itself is not rerun.
export const pinProbes = {
  'r0-amin-cohort-pin-readonly': async context => {
    const directory = mkdtempSync(join(tmpdir(), 'wxw-cohort-'));
    const copy = join(directory, 'pin.json');
    copyFileSync(pinFile, copy);
    const before = readFileSync(copy);
    const moved = JSON.parse(before).cohort.map(entry => ({ ...entry }));
    moved[0].verdict = `${moved[0].verdict} (moved)`;
    process.env.WXW_PIN_FAIL_ONLY = '1';
    let refused = false;
    try {
      assertCohort(moved, copy);
    } catch {
      refused = true;
    }
    const after = readFileSync(copy);
    rmSync(directory, { recursive: true, force: true });
    if (!refused) fail('a moved cohort passed under WXW_PIN_FAIL_ONLY=1');
    if (!before.equals(after))
      fail('the pin file was modified by the comparison');
    passed(context);
  }
};
