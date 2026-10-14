// R001 regression rows, imported by scripts/regression.mjs; their probes
// are in test/regression-r001.mjs. Each restores one defect in a whole,
// compiling form.
export const r001Rows = [
  {
    // No specialization-time printable check (BACKLOG E017): a type
    // variable instantiated with a function passes the checker and fails
    // `go build` (E_TOOL).
    name: 'r001-print-ground', file: 'src/Features/Specialize.purs',
    needle: '  checkSites env state\n',
    replacement: '',
    probe: 'r001-print-ground', message: /E_TOOL/
  }
];
