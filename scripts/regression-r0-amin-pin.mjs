// R0 a-min tranche 1 regression row for the fail-only cohort pin
// (Tasks 22, 24), spread into r0AminRows (scripts/regression-r0-amin.mjs);
// probe in test/regression-r0-amin-pin.mjs.
const compare = 'test/r0-fail-only-compare.mjs';
export const pinRows = [
  {
    // Tasks 22, 24: the old in-test writer restored inside the shared
    // comparison, so a moved cohort rewrites the pin and then passes. The
    // edits are to a test helper, so the row runs from its own copy of
    // test/ (tree: 'test') and never touches the real fixture.
    name: 'r0-amin-cohort-pin-readonly',
    tree: 'test',
    edits: [
      {
        file: compare,
        needle: "import { readFileSync } from 'node:fs';\n",
        replacement: "import { readFileSync, writeFileSync } from 'node:fs';\n"
      },
      {
        file: compare,
        needle: 'export const assertCohort = (cohort, file = pinFile) =>\n'
          + '  assert.deepEqual(cohort, JSON.parse(readFileSync(file, '
          + "'utf8')).cohort,\n"
          + "    'the fail-only cohort of the section 18.102 amendment "
          + "moved (members '\n"
          + "    + 'or verdicts); this needs the author, do not re-pin');\n",
        replacement: 'export const assertCohort = (cohort, file = pinFile) '
          + '=> {\n'
          + "  if (process.env.WXW_PIN_FAIL_ONLY === '1')\n"
          + '    writeFileSync(file, `${JSON.stringify({ cohort })}\\n`);\n'
          + '  assert.deepEqual(cohort, JSON.parse(readFileSync(file, '
          + "'utf8')).cohort);\n"
          + '};\n'
      }
    ],
    probe: 'r0-amin-cohort-pin-readonly',
    message: /a moved cohort passed under WXW_PIN_FAIL_ONLY=1/
  }
];
