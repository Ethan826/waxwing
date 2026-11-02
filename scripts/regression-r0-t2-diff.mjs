// Tranche 2 Task 15 regression rows (the differential, marks only;
// design §F, dossier §18.151, §18.155), for the tranche 2 registry;
// probes in test/regression-r0-t2-diff.mjs. Each restores one defect in
// a whole, compiling form: two in the forgery generator (test tree), one
// in the validator.
const forge = 'test/r0-t2-diff-forge.mjs';

export const t2DiffRows = [
  {
    // A position forgery that writes back the term it read: no term
    // changes, the differential is vacuous on positions.
    name: 'r0-t2-diff-nonvacuous',
    tree: 'test',
    file: forge,
    needle: '          input: mb.withTerm(input, position, to) }));\n',
    replacement: '          input: mb.withTerm(input, position, term) }));\n',
    probe: 'r0-t2-diff-nonvacuous',
    message: /r0-t2-diff-nonvacuous: \[.*no term changed/
  },
  {
    // A binding forgery that appends a re-marked copy of the label (a
    // duplicated label: a row forgery, not a mark forgery).
    name: 'r0-t2-diff-marks-only',
    tree: 'test',
    file: forge,
    needle: '    const labels = row.labels.map((item, at) => at === index\n'
      + '      ? { ...item, mark: toTerm(term) } : item);\n',
    replacement: '    const labels = [...row.labels,\n'
      + '      { ...row.labels[index], mark: toTerm(term) }];\n',
    probe: 'r0-t2-diff-marks-only',
    message: /r0-t2-diff-marks-only: \[.*: row"/
  },
  {
    // Statements §4 E6 (as A2's r0-a2-mb-detects): a deferral's labels
    // weakened to `⊑ M`, the validator accepts C2(b)'s d at M, and the
    // differential reports M-B refusing it.
    name: 'r0-t2-diff-detects',
    file: 'src/Features/Check/Strategy/Effects/Sites.purs',
    needle: '  demanded label = check (holds label.mark TermN)\n',
    replacement: '  demanded label = check (holds label.mark TermM)\n',
    probe: 'r0-t2-diff-detects',
    message: new RegExp('r0-t2-diff-detects: \\["C2\\(b\\) d at M honest: '
      + 'validator Right, M-B refuses')
  }
];
