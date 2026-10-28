import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The fail-only cohort's comparison (dossier 18.102), shared by
// r0-effects-boundary.serial.test.mjs and its regression probe. It only
// reads: the pin file is written by scripts/r0-fail-only-pin.mjs, on the
// author's word, never by a test and whatever the environment.
export const pinFile = 'test/fixtures/r0/effects-fail-only.json';

export const assertCohort = (cohort, file = pinFile) =>
  assert.deepEqual(cohort, JSON.parse(readFileSync(file, 'utf8')).cohort,
    'the fail-only cohort of the section 18.102 amendment moved (members '
    + 'or verdicts); this needs the author, do not re-pin');
