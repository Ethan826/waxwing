// Tranche 2 Task 9 regression rows (mark terms as least terms; design
// §C.8, §E, §F; statements §5), for the tranche 2 registry; probes in
// test/regression-r0-t2-marks.mjs. Each restores one defect in a whole,
// compiling form.
const least = 'src/Features/Check/Strategy/ReadBack/Least.purs';
const marks = 'src/Features/Check/Strategy/ReadBack/Marks.purs';

export const t2MarksRows = [
  {
    // Least terms per position: the store's bindings (equalities)
    // ignored, the bounded oracle's known mutant.
    name: 'r0-t2-marks-equalities',
    file: least,
    needle: '  classes = classesOf graph.equalities\n',
    replacement: '  classes = classesOf (const [] graph.equalities)\n',
    probe: 'r0-t2-marks-equalities',
    message: /r0-t2-marks-equalities: \["shared","oracle"\]/
  },
  {
    // A meta the least terms do not name read as M instead of N.
    name: 'r0-t2-marks-absent-n',
    file: least,
    needle: '  MarkMeta meta → fromMaybe TermN (Map.lookup meta terms)\n',
    replacement: '  MarkMeta meta → fromMaybe TermM (Map.lookup meta terms)\n',
    probe: 'r0-t2-marks-absent-n',
    message: /r0-t2-marks-absent-n: \["meta 42"\]/
  },
  {
    // The rigid constants reaching a class read as M, not their join.
    name: 'r0-t2-marks-rigid',
    file: least,
    needle: '    | otherwise → TermJ rigid\n',
    replacement: '    | otherwise → const TermM rigid\n',
    probe: 'r0-t2-marks-rigid',
    message: /r0-t2-marks-rigid: \["join","frame"\]/
  },
  {
    // Two readings that differ resolved by taking the first.
    name: 'r0-t2-marks-apart',
    file: marks,
    needle: '    | otherwise = Left (PositionApart position)\n',
    replacement: '    | otherwise = Right (Tuple position (term first))\n',
    probe: 'r0-t2-marks-apart',
    message: /r0-t2-marks-apart: \["apart"\]/
  },
  {
    // An `Unmarked` reading taken as a term (N) instead of refused.
    name: 'r0-t2-marks-unmarked',
    file: marks,
    needle: '    | Array.elem Unmarked marks = '
      + 'Left (UnreadPosition position)\n',
    replacement: '    | Array.elem Unmarked [] = '
      + 'Left (UnreadPosition position)\n',
    probe: 'r0-t2-marks-unmarked',
    message: /r0-t2-marks-unmarked: \["unmarked"\]/
  }
];
