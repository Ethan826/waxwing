// R0 a-min tranche 1 regression rows for the effect-only E1 sites (Task 7:
// O1 at a handler clause, O2 at a `with` node), spread into r0AminRows
// (scripts/regression-r0-amin.mjs); probes in
// test/regression-r0-amin-equal.mjs. Each restores the defect in a
// compiling form: the call stays, behind `when false`.
const generate = 'src/Features/Check/Generate/';
export const equalRows = [
  {
    // Task 7, O1: the clause body's equation against the operation's
    // declared result is not recorded.
    name: 'r0-amin-equal-o1',
    file: `${generate}HandlerClause.purs`,
    needle: '        equalAt (at context path (ExprRule 20)) ClauseBody'
      + ' clause.span\n          body.marked\n          result\n',
    replacement: '        when false\n'
      + '          ( equalAt (at context path (ExprRule 20)) ClauseBody'
      + ' clause.span\n              body.marked\n              result\n'
      + '          )\n',
    probe: 'r0-amin-equal-o1',
    message: /O1 \(the clause body against the operation result\) is not/
  },
  {
    // Task 7, O2: the `with` node's equation against its body's type is
    // not recorded.
    name: 'r0-amin-equal-o2',
    file: `${generate}Effect.purs`,
    needle: '        equalAt (at context path (ExprRule 21)) WithNode span'
      + ' (markedFlex res)\n          bodyPart.marked\n',
    replacement: '        when false\n'
      + '          ( equalAt (at context path (ExprRule 21)) WithNode span'
      + ' (markedFlex res)\n              bodyPart.marked\n          )\n',
    probe: 'r0-amin-equal-o2',
    message: /O2 \(the with node against its body\) is not recorded/
  },
  {
    // Task 7 fix round 1: Sig3's equation drops the written result's
    // marks (the body's marked type on both sides).
    name: 'r0-amin-equal-sig3-marks',
    file: `${generate}Signature.purs`,
    needle: 'agreeEqual bodySpan body written markedBody sig.result',
    replacement: 'agreeEqual bodySpan body written markedBody markedBody',
    probe: 'r0-amin-equal-sig3-marks',
    message: /Sig3's E1 right side lost the written result's marks/
  }
];
