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
    // Task 3: forced tails anywhere, spec §2.3's placement unchecked.
    name: 'r0-a2-forced-placement',
    file: record,
    needle: '    , any (flip member scope.forced) entry.refs.effects\n',
    replacement: '    , any (flip member scope.forced) []\n',
    probe: 'r0-a2-forced-placement',
    message: /forced tail in an Entry row: check null/
  },
  {
    // Task 3 (Task 1 review): a ResultC tail `⟨p, result clauses⟩` with
    // R closed, which F omits, accepted.
    name: 'r0-a2-forced-closed',
    file: record,
    needle: '    , entry.closedForced\n',
    replacement: '    , false\n',
    probe: 'r0-a2-forced-closed',
    message: /ResultC tail with R closed: check null/
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
