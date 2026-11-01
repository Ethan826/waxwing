// A2 lane regression rows (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-prereq.mjs. Each restores one defect in a whole,
// compiling form.
const record = 'src/Features/Check/Strategy/Effects/Record.purs';

export const a2PrereqRows = [
  {
    // Task 3, C4: the site table trusts a non-bare installed C.
    name: 'r0-a2-site-flags',
    file: record,
    needle: '  AtInstalledC → { marks: true, bare: true }\n',
    replacement: '  AtInstalledC → { marks: true, bare: false }\n',
    probe: 'r0-a2-site-flags',
    message: /site flags differ from spec §9: AtInstalledC/
  },
  {
    // Task 3 review: references read without their sort, so a type
    // variable at row sort and a record tail at type sort are accepted.
    name: 'r0-a2-record-refs',
    file: record,
    needle: '  hasSort sort info = info.sort == sort\n',
    replacement: '  hasSort _ _ = true\n',
    probe: 'r0-a2-record-refs',
    message: /references at the wrong sort: type variable at row sort,record/
  },
  {
    // Task 3: forced tails anywhere, spec §2.3's placement unchecked.
    name: 'r0-a2-forced-placement',
    file: record,
    needle: '    , any (flip member scope.forced) entry.refs.effects\n',
    replacement: '    , any (flip member scope.forced) []\n',
    probe: 'r0-a2-forced-placement',
    message: /forced tail in an Entry row: check null/
  },
  {
    // Task 3 (controller ruling): `⟨q, result clauses⟩` outside F
    // accepted, at a closed-R instance or at another path.
    name: 'r0-a2-unforced-result-clauses',
    file: record,
    needle: '        || any (unforced scope)'
      + ' (entry.refs.effects <> entry.refs.placed)\n',
    replacement: '        || any (unforced scope) []\n',
    probe: 'r0-a2-unforced-result-clauses',
    message: /result clauses outside F: checks \[null,null\]/
  },
  {
    // Task 3: `Fail` payloads unchecked, a flexible one with no
    // `FailConcrete` accepted.
    name: 'r0-a2-fail-invariant',
    file: record,
    needle: '    , any (payloadWrong scope) entry.refs.payloads\n',
    replacement: '    , any (payloadWrong scope) []\n',
    probe: 'r0-a2-fail-invariant',
    message: /Fail payload with no FailConcrete: check null/
  }
];
