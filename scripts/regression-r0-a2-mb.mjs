// A2 Task 13's regression row (docs/plans/2026-10-31-a2-validator-plan.md),
// spread into a2Rows (scripts/regression-r0-a2.mjs); its probe is in
// test/regression-r0-a2-mb.mjs. It restores a dropped edge kind in a
// whole, compiling form, and the M-B differential's first test fails.
export const a2MbRows = [
  {
    // Statements §4 E6 (DeferHandlerMayFail): each non-`Fail` label of d
    // `⊑ N`. Its target weakened to M, the edge always holds, so C2(b)'s
    // d holding `Log` at M is accepted while the pinned M-B graph holds
    // `M ⊑ N` and fails.
    name: 'r0-a2-mb-detects',
    file: 'src/Features/Check/Strategy/Effects/Sites.purs',
    needle: '  demanded label = check (holds label.mark TermN)\n',
    replacement: '  demanded label = check (holds label.mark TermM)\n',
    probe: 'r0-a2-mb-detects',
    message: new RegExp('accepted packages pass the pinned graph: '
      + 'C2\\(b\\) d at M: judgeObligations accepts; M-B refuses')
  }
];
