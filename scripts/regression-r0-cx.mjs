// Task 5.2's regression rows (the CX check), spread into r0Rows
// (scripts/regression-r0.mjs); probes in test/regression-r0-cx.mjs.
export const r0CxRows = [
  {
    // The check never decides `D` under `ρ`, so a counter-instance that
    // violates `D` refutes (CX C1-D, X7: the whole `D` is read).
    name: 'r0-cx-hypothesis-skipped',
    file: 'src/Features/Check/Refute/Counter/Check.purs',
    needle: '  hypothesis rho whole\n',
    replacement: '  const (pure unit) (hypothesis rho whole)\n',
    probe: 'r0-cx-hypothesis-skipped',
    message: /a counter-instance violating D was accepted: Right/
  }
];
