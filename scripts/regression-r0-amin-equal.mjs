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
    // Task 7 fix round 1: Sig3's equation takes the body's marked type
    // on both sides. Detected through ERASURE only: the probe's
    // "sides differ" check, since the body's erasure here differs from
    // the written result's. The marked-side check never fires for it;
    // r0-amin-equal-sig3-mark-only covers that check.
    name: 'r0-amin-equal-sig3-marks',
    file: `${generate}Signature.purs`,
    needle: 'agreeEqual bodySpan body written markedBody sig.result',
    replacement: 'agreeEqual bodySpan body written markedBody markedBody',
    probe: 'r0-amin-equal-sig3-marks',
    message: /Sig3's E1 right side lost the written result's marks/
  },
  {
    // Task 7: the marked-side check's own evidence. Sig3's right side is
    // re-marked under `InAnnotation`: the same erasure as the declared
    // result, different marks, and no recorded type carries them, so the
    // failure is "marked side matches no recorded type", not the
    // erasure comparison. `sig` stays used (`<* pure sig.result`), so
    // the strict build accepts the mutant.
    name: 'r0-amin-equal-sig3-mark-only',
    file: `${generate}Signature.purs`,
    needle: '  bodyAt sig written = sigAt (place InBody []) 3\n'
      + '    [ agreeEqual bodySpan body written markedBody sig.result ]\n',
    replacement: '  bodyAt sig written =\n'
      + '    lifted\n'
      + '      ( marked tables (InAnnotation (place InResult []).path 0)\n'
      + '          function.result <* pure sig.result\n'
      + '      ) >>= \\again →\n'
      + '      sigAt (place InBody []) 3\n'
      + '        [ agreeEqual bodySpan body written markedBody again ]\n',
    probe: 'r0-amin-equal-sig3-mark-only',
    message: /marked side matches no recorded type/
  }
];
