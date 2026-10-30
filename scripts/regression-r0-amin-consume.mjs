// R0 a-min tranche 1 regression row for Task 8's stage consumptions,
// spread into r0AminRows (scripts/regression-r0-amin.mjs); probe in
// test/regression-r0-amin-consume.mjs. The defect is restored in a
// compiling form: an application's stages are counted as none.
const generate = 'src/Features/Check/Generate/';
export const consumeRows = [
  {
    // Task 8: an Apply (or Pipe) stage records no consumption into its
    // ambient row.
    name: 'r0-amin-consume-stage-site',
    file: `${generate}Consume.purs`,
    needle: 'applyStages context place count = traverse_ stage'
      + ' (indices count)\n',
    replacement: 'applyStages context place _ = traverse_ stage'
      + ' (indices 0)\n',
    probe: 'r0-amin-consume-stage-site',
    message: /an Apply stage is not consumed into its ambient row/
  },
  {
    // §18.124 ruling 1: `fail` records no Consume of Fail(payload).
    name: 'r0-amin-consume-fail',
    file: 'src/Features/Check/Generate/Failure.purs',
    needle: '        consumeAt (at context path (ExprRule 23)) span\n'
      + '          { site: AtFail, ordinal: 0, source: failRow paid.marked }\n'
      + '          context.ambient\n',
    replacement: '        pure (const unit (failRow paid.marked))\n',
    probe: 'r0-amin-consume-fail',
    message: /fail does not consume Fail\(payload\) into its ambient row/
  }
];
