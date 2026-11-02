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
    needle: '      MarkMeta meta → '
      + 'Just (fromMaybe TermN (Map.lookup meta found.terms))\n',
    replacement: '      MarkMeta meta → '
      + 'Just (fromMaybe TermM (Map.lookup meta found.terms))\n',
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
    needle: '    | not (Array.all (eq read.first) read.all) =\n',
    replacement: '    | not (Array.all (eq read.first) [ read.first ]) =\n',
    probe: 'r0-t2-marks-apart',
    message: /r0-t2-marks-apart: \["apart"\]/
  },
  {
    // An `Unmarked` mark given a term (N) instead of none.
    name: 'r0-t2-marks-unmarked',
    file: least,
    needle: '      Unmarked → Nothing\n',
    replacement: '      Unmarked → Just TermN\n',
    probe: 'r0-t2-marks-unmarked',
    message: /r0-t2-marks-unmarked: \["unmarked"\]/
  },
  {
    // A position a Console or Fail label refers to read as whatever its
    // class says: no refusal of a term other than N.
    name: 'r0-t2-marks-console-n',
    file: marks,
    needle: '    | Set.member position fixedN '
      + '&& read.first /= TermN =\n',
    replacement: '    | Set.member position Set.empty '
      + '&& read.first /= TermN =\n',
    probe: 'r0-t2-marks-console-n',
    message: /r0-t2-marks-console-n: \["M"\]/
  },
  {
    // Edges read upper ⊑ lower.
    name: 'r0-t2-marks-direction',
    file: least,
    needle: '  ends edge = Tuple edge.lower edge.upper\n',
    replacement: '  ends edge = Tuple edge.upper edge.lower\n',
    probe: 'r0-t2-marks-direction',
    message: /r0-t2-marks-direction: \["below","above"\]/
  },
  {
    // A constant class read from what reaches it, not its constant.
    name: 'r0-t2-marks-constant',
    file: least,
    needle: 'rootTerm reach root = case root of\n',
    replacement: 'rootTerm reach root = case NodeMeta 0 of\n',
    probe: 'r0-t2-marks-constant',
    message: /r0-t2-marks-constant: \["J\{k\}","N"\]/
  },
  {
    // M reaching a class not taking precedence over rigid constants.
    name: 'r0-t2-marks-precedence',
    file: least,
    needle: '    | Set.member NodeM from → TermM\n',
    replacement: '    | Set.member NodeM Set.empty → TermM\n',
    probe: 'r0-t2-marks-precedence',
    message: /r0-t2-marks-precedence: \["precedence"\]/
  },
  {
    // A two-constant class read on (its metas' terms all Nothing, so
    // UnreadPosition) instead of the MarkClash fault.
    name: 'r0-t2-marks-clash',
    file: marks,
    needle: '  when (terms.clashes > 0) (Left MarkClash)\n',
    replacement: '  when (terms.clashes > 0 && false) (Left MarkClash)\n',
    probe: 'r0-t2-marks-clash',
    message: /r0-t2-marks-clash: \["read"\]/
  },
  {
    // An ambiguous Fail label takes the first candidate (§18.155 (3)).
    name: 'r0-t2-marks-take-first',
    file: 'src/Features/Check/Strategy/ReadBack/EffectMatch.purs',
    needle: '    | Array.length several > 1 && Array.any loose several = '
      + 'Nothing\n',
    replacement: '    | Array.length several > 1 && Array.any loose [] = '
      + 'Nothing\n',
    probe: 'r0-t2-marks-take-first',
    message: /r0-t2-marks-take-first: \["effect unknown head","marks/
  }
];
